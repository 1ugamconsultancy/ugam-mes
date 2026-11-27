import { WorkflowService } from './workflow.service';
import { currentPlant, currentAccess } from '../auth/access-context';
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder as TypeOrmWorkOrder, Product } from './work-orders.entity';

export interface WorkOrder {
  id: string;
  woNumber: string;
  productId: string;
  productName: string;
  productSku: string;
  targetQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: 'DRAFT' | 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'REVIEWED' | 'CLOSED';
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private workflow: WorkflowService,
    @InjectRepository(TypeOrmWorkOrder)
    private workOrderRepository: Repository<TypeOrmWorkOrder>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  private mapToLegacy(wo: TypeOrmWorkOrder): WorkOrder {
    return {
      id: wo.id,
      woNumber: wo.woNumber,
      productId: wo.productId,
      productName: wo.product?.name || null,
      productSku: wo.product?.sku || null,
      targetQuantity: wo.targetQuantity,
      completedQuantity: wo.completedQuantity,
      scrapQuantity: wo.scrapQuantity,
      plannedStart: wo.plannedStart,
      plannedEnd: wo.plannedEnd,
      actualStart: wo.actualStart || undefined,
      actualEnd: wo.actualEnd || undefined,
      status: wo.status,
    };
  }

  async findAll(): Promise<WorkOrder[]> {
    const wos = await this.workOrderRepository.find({
      where: { plantId: currentPlant() },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(wos.map(async wo => ({...this.mapToLegacy(wo),...await this.workflow.describe(wo.id)})));
  }

  async findById(id: string): Promise<WorkOrder> {
    const wo = await this.workOrderRepository.findOne({
      where: { id, plantId: currentPlant() },
      relations: ['product'],
    });
    if (!wo) {
      throw new NotFoundException(`Batch Record with ID ${id} not found`);
    }
    const [snapshotRow] = await this.workOrderRepository.query('SELECT recipe_id,evidence_snapshot FROM work_orders WHERE id=$1 AND plant_id=$2', [id,currentPlant()]);
    const recipe = snapshotRow?.evidence_snapshot?.recipe;
    const releasedRecipe = recipe?.id === snapshotRow?.recipe_id ? {id:recipe.id,code:recipe.recipe_code,version:recipe.version,instructions:recipe.process_instructions} : null;
    return {...this.mapToLegacy(wo),...await this.workflow.describe(wo.id),releasedRecipe} as WorkOrder;
  }

  /**
   * Creates a work order directly in PLANNED state.
   * Insert (DRAFT) + PLAN transition + audit history happen in ONE transaction,
   * so an order can never be left half-created.
   */
  async create(dto: any): Promise<WorkOrder> {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const qty = dto?.targetQuantity;
    if (typeof dto?.productId !== 'string' || !UUID.test(dto.productId)) throw new BadRequestException('A valid product is required');
    if (!Number.isSafeInteger(qty) || qty <= 0 || qty > 10_000_000) throw new BadRequestException('Target quantity must be a whole number between 1 and 10,000,000');
    const plannedStart = new Date(dto.plannedStart), plannedEnd = new Date(dto.plannedEnd);
    if (isNaN(plannedStart.getTime()) || isNaN(plannedEnd.getTime())) throw new BadRequestException('Valid planned start and end are required');
    if (!(plannedEnd > plannedStart)) throw new BadRequestException('Planned end must be after planned start');
    if (dto.recipeId != null && dto.recipeId !== '' && (typeof dto.recipeId !== 'string' || !UUID.test(dto.recipeId))) throw new BadRequestException('Invalid recipe');
    const recipeId: string | null = dto.recipeId ? dto.recipeId : null;

    let requested = typeof dto.woNumber === 'string' ? dto.woNumber.trim().toUpperCase() : '';
    if (requested && !/^[A-Z0-9][A-Z0-9_-]{2,49}$/.test(requested)) {
      throw new BadRequestException('Work order number must be 3-50 characters: letters, numbers, - or _');
    }
    const reason = (typeof dto.reason === 'string' && dto.reason.trim() ? dto.reason.trim() : 'Work order created and planned').slice(0, 500);

    const actor = currentAccess();
    const plantId = currentPlant();

    const attempt = async (): Promise<string> => this.workOrderRepository.manager.transaction(async (m) => {
      const [product] = await m.query('SELECT id FROM products WHERE id=$1 AND plant_id=$2', [dto.productId, plantId]);
      if (!product) throw new NotFoundException('Product not found in the active plant');
      if (recipeId) {
        const [recipe] = await m.query("SELECT id FROM batch_recipes WHERE id=$1 AND product_id=$2 AND plant_id=$3 AND status IN ('ACTIVE','RELEASED')", [recipeId, dto.productId, plantId]);
        if (!recipe) throw new BadRequestException('Recipe must be an active or released recipe for the selected product in this plant');
      }
      let woNumber = requested;
      if (!woNumber) {
        const [plant] = await m.query('SELECT code FROM plants WHERE id=$1', [plantId]);
        const code = String(plant?.code || 'PLANT').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, 20) || 'PLANT';
        const prefix = 'WO-' + code + '-' + new Date().getFullYear() + '-';
        const [last] = await m.query("SELECT wo_number FROM work_orders WHERE wo_number LIKE $1 ORDER BY length(wo_number) DESC, wo_number DESC LIMIT 1", [prefix + '%']);
        const lastSeq = last ? parseInt(String(last.wo_number).slice(prefix.length), 10) : 0;
        woNumber = prefix + String((Number.isFinite(lastSeq) ? lastSeq : 0) + 1).padStart(3, '0');
      }
      const id = randomUUID();
      await m.query(
        `INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity,
           planned_start, planned_end, status, created_by, created_at, updated_at, plant_id, organization_id,
           recipe_id, revision, legacy_unverified)
         VALUES ($1,$2,$3,$4,0,0,$5,$6,'DRAFT',$7,now(),now(),$8,$9,$10,0,false)`,
        [id, woNumber, dto.productId, qty, plannedStart, plannedEnd, actor.sub, plantId, actor.organizationId || null, recipeId],
      );
      await m.query(
        'INSERT INTO order_transition_history(id,work_order_id,action,from_status,to_status,revision,actor_id,reason,reauthenticated,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [randomUUID(), id, 'PLAN', 'DRAFT', 'PLANNED', 1, actor.sub, reason, false, { source: 'create' }],
      );
      await m.query("UPDATE work_orders SET status='PLANNED', revision=1, updated_at=now() WHERE id=$1", [id]);
      return id;
    });

    let id: string | undefined;
    for (let i = 0; i < 5 && !id; i++) {
      try {
        id = await attempt();
      } catch (e: any) {
        const dup = e?.code === '23505' && String(e?.constraint || e?.detail || '').includes('wo_number');
        if (!dup) throw e;
        if (requested) throw new ConflictException('Work order number already exists');
        // auto-numbered: another request took the same sequence; retry with the next one
      }
    }
    if (!id) throw new ConflictException('Could not allocate a work order number, please retry');
    return this.findById(id);
  }

  async update(id: string, dto: any): Promise<WorkOrder> {
    if (dto.status !== undefined || dto.completedQuantity !== undefined || dto.scrapQuantity !== undefined) throw new BadRequestException('Use workflow transitions or production count endpoints');
    await this.workflow.updateSetup(id,dto);return this.findById(id);
  }
  async incrementProgress(id: string, good: number, scrap: number, machineId?: string): Promise<WorkOrder> {
    await this.workflow.counts(id,good,scrap,machineId); return this.findById(id);
  }
}
