import { WorkflowService } from './workflow.service';
import { currentPlant, currentAccess } from '../auth/access-context';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async create(dto: Partial<WorkOrder>): Promise<WorkOrder> {
    if (!dto.woNumber || !dto.productId || !Number.isSafeInteger(dto.targetQuantity) || dto.targetQuantity<=0 || !dto.plannedStart || !dto.plannedEnd || !(new Date(dto.plannedEnd)>new Date(dto.plannedStart))) {
      throw new BadRequestException('Missing required fields to create Batch Record');
    }

    const product = await this.productRepository.findOneBy({ id: dto.productId });
    // Product catalog is scoped separately; orders always belong to the active plant.
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const newWO = this.workOrderRepository.create({
      plantId: currentPlant(),
      createdBy: currentAccess().sub,
      woNumber: dto.woNumber,
      productId: dto.productId,
      targetQuantity: dto.targetQuantity,
      completedQuantity: 0,
      scrapQuantity: 0,
      plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : new Date(),
      plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: 'DRAFT',
    });

    const saved = await this.workOrderRepository.save(newWO);
    return this.findById(saved.id);
  }

  async update(id: string, dto: any): Promise<WorkOrder> {
    if (dto.status !== undefined || dto.completedQuantity !== undefined || dto.scrapQuantity !== undefined) throw new BadRequestException('Use workflow transitions or production count endpoints');
    await this.workflow.updateSetup(id,dto);return this.findById(id);
  }
  async incrementProgress(id: string, good: number, scrap: number, machineId?: string): Promise<WorkOrder> {
    await this.workflow.counts(id,good,scrap,machineId); return this.findById(id);
  }
}
