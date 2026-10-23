import { validateRequirements } from '../work-orders/workflow-policy';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchRecipe } from './recipes.entity';
import { Product } from '../work-orders/work-orders.entity';

function getNextRevision(currentVer?: string): string {
  if (!currentVer) return 'A';
  const trimmed = currentVer.trim();
  // Single letter e.g. 'A' -> 'B'
  if (/^[A-Za-z]$/.test(trimmed)) {
    const charCode = trimmed.toUpperCase().charCodeAt(0);
    return String.fromCharCode(charCode + 1);
  }
  // 'Rev A' -> 'Rev B'
  const match = trimmed.match(/^Rev\s+([A-Za-z])$/i);
  if (match) {
    const charCode = match[1].toUpperCase().charCodeAt(0);
    return String.fromCharCode(charCode + 1);
  }
  // Decimal or integer e.g. '1.0' -> '2.0', '1' -> '2'
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    if (trimmed.includes('.')) {
      return (num + 1.0).toFixed(1);
    }
    return String(num + 1);
  }
  return `${trimmed}.1`;
}

@Injectable()
export class RecipesService {
  async evidenceRevision(userId: string, id: string, requirements: any) {
    validateRequirements(requirements);
    return this.recipeRepo.manager.transaction(async m => {
      const repo=m.getRepository(BatchRecipe);
      const old=await repo.findOne({where:{id},lock:{mode:'pessimistic_write'}});
      if(!old) throw new NotFoundException('Recipe not found');
      const version=getNextRevision(old.version);
      const copy=repo.create({...old,id:undefined,createdAt:undefined,version,createdBy:userId,evidenceRequirements:requirements,status:'ACTIVE'});
      old.status='SUPERSEDED';await repo.save(old);return repo.save(copy);
    });
  }
  constructor(
    @InjectRepository(BatchRecipe)
    private recipeRepo: Repository<BatchRecipe>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  async getRecipes(): Promise<BatchRecipe[]> {
    return this.recipeRepo.find({
      relations: ['product', 'creator'],
      order: { recipeCode: 'ASC', version: 'DESC', createdAt: 'DESC' }
    });
  }

  async getProducts(): Promise<Product[]> {
    return this.productRepo.find({ order: { sku: 'ASC' } });
  }

  async getRecipeById(id: string): Promise<BatchRecipe> {
    const recipe = await this.recipeRepo.findOne({
      where: { id },
      relations: ['product', 'creator']
    });
    if (!recipe) throw new NotFoundException(`Recipe with ID ${id} not found`);
    return recipe;
  }

  async getRecipeByProductSku(sku: string): Promise<BatchRecipe> {
    const product = await this.productRepo.findOneBy({ sku });
    if (!product) throw new NotFoundException(`Product with SKU ${sku} not found`);

    const recipe = await this.recipeRepo.findOne({
      where: { productId: product.id, status: 'ACTIVE' },
      relations: ['product'],
      order: { version: 'DESC' }
    });
    if (!recipe) throw new NotFoundException(`Active recipe for SKU ${sku} not found`);
    return recipe;
  }

  // Version-Controlled Recipe Creation (GAMP 5)
  async createRecipe(userId: string, dto: any): Promise<BatchRecipe> {
    const requirements=dto.evidenceRequirements?validateRequirements(dto.evidenceRequirements):null;
    const existingActive = await this.recipeRepo.findOneBy({ recipeCode: dto.recipeCode, status: 'ACTIVE' });
    
    let version = dto.version || 'A';
    if (existingActive) {
      existingActive.status = 'ARCHIVED';
      await this.recipeRepo.save(existingActive);
      if (!dto.version) {
        version = getNextRevision(existingActive.version);
      }
    }

    const newRecipe = this.recipeRepo.create({
      productId: dto.productId,
      recipeCode: dto.recipeCode,
      recipeName: dto.recipeName,
      version: version,
      masterFormula: dto.masterFormula,
      bom: dto.bom || [],
      processInstructions: dto.processInstructions || [],
      evidenceRequirements: requirements,
      plannedYieldPct: dto.plannedYieldPct || 100.00,
      status: 'ACTIVE',
      createdBy: userId,
    });

    return this.recipeRepo.save(newRecipe);
  }

  // Revise Recipe (GAMP 5: Archives previous active recipe and creates new revision)
  async reviseRecipe(userId: string, dto: any): Promise<BatchRecipe> {
    const { recipeCode, recipeName, newVersion, masterFormula, bom, processInstructions, plannedYieldPct } = dto;
    
    // 1. Find the currently active recipe for this code
    const existingActive = await this.recipeRepo.findOne({
      where: { recipeCode, status: 'ACTIVE' },
      order: { createdAt: 'DESC' }
    });

    let targetVersion = newVersion;
    if (!targetVersion) {
      targetVersion = existingActive ? getNextRevision(existingActive.version) : 'B';
    }

    // 2. Archive older recipe if present
    if (existingActive) {
      existingActive.status = 'ARCHIVED';
      await this.recipeRepo.save(existingActive);
    }

    // 3. Create and release new revision
    const revised = this.recipeRepo.create({
      productId: dto.productId || existingActive?.productId,
      recipeCode: recipeCode,
      recipeName: recipeName || existingActive?.recipeName || recipeCode,
      version: targetVersion,
      masterFormula: masterFormula || existingActive?.masterFormula,
      bom: bom || existingActive?.bom || [],
      processInstructions: processInstructions || existingActive?.processInstructions || [],
      evidenceRequirements: dto.evidenceRequirements ? validateRequirements(dto.evidenceRequirements) : existingActive?.evidenceRequirements || null,
      plannedYieldPct: plannedYieldPct || existingActive?.plannedYieldPct || 100.00,
      status: 'ACTIVE',
      createdBy: userId,
    });

    return this.recipeRepo.save(revised);
  }

  async getAllBoms(): Promise<any[]> {
    return this.recipeRepo.query(`
      SELECT 
        bh.bom_id, bh.parent_material, bh.revision, bh.effective_from, bh.effective_to, bh.status,
        mm_parent.material_name as parent_name,
        mm_parent.image_path as parent_image,
        mm_parent.material_type as parent_type,
        bc.line_no, bc.component_material, bc.component_type, bc.qty, bc.uom,
        mm_comp.material_name as component_name,
        mm_comp.image_path as component_image
      FROM bom_header bh
      LEFT JOIN material_master mm_parent ON bh.parent_material = mm_parent.material_code
      LEFT JOIN bom_component bc ON bh.bom_id = bc.bom_id AND bh.revision = bc.revision
      LEFT JOIN material_master mm_comp ON bc.component_material = mm_comp.material_code
      ORDER BY bh.bom_id ASC, bh.revision DESC, bc.line_no ASC
    `);
  }

  // Create New BOM
  async createBom(dto: any): Promise<any> {
    const bom_id = dto.bom_id || dto.bomId;
    const parent_material = dto.parent_material || dto.parentMaterial || dto.materialCode;
    const revision = dto.revision || dto.newRevision || 'A';
    const status = dto.status || 'RELEASED';
    const components = dto.components || [];
    const effective_from = dto.effective_from || dto.effectiveFrom || new Date().toISOString().split('T')[0];

    // 1. Insert into bom_header
    await this.recipeRepo.query(
      `INSERT INTO bom_header (bom_id, parent_material, revision, effective_from, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (bom_id, revision) DO UPDATE 
       SET parent_material = EXCLUDED.parent_material, effective_from = EXCLUDED.effective_from, status = EXCLUDED.status`,
      [bom_id, parent_material, revision, effective_from, status]
    );

    // 2. Clear and insert bom_components for this bom_id and revision
    await this.recipeRepo.query(
      `DELETE FROM bom_component WHERE bom_id = $1 AND revision = $2`,
      [bom_id, revision]
    );

    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const lineNo = c.line_no || c.lineNumber || (i + 1) * 10;
      await this.recipeRepo.query(
        `INSERT INTO bom_component (bom_id, revision, line_no, parent_material, component_material, component_type, qty, uom)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [bom_id, revision, lineNo, parent_material, c.component_material || c.component_code || c.componentCode, c.component_type || c.componentType || 'RAW', c.qty || c.quantity || 1.0, c.uom || 'PCS']
      );
    }

    return { success: true, bom_id, revision, status };
  }

  // Revise BOM: Archives previous active BOM revision and releases new revision
  async reviseBom(dto: any): Promise<any> {
    const bom_id = dto.bom_id || dto.bomId;
    const parent_material = dto.parent_material || dto.parentMaterial || dto.materialCode;
    const newRevision = dto.newRevision || dto.revision;
    const components = dto.components || [];
    const effective_from = dto.effective_from || dto.effectiveFrom || new Date().toISOString().split('T')[0];

    // 1. Find currently active BOM revision for this bom_id
    const activeHeaders = await this.recipeRepo.query(
      `SELECT * FROM bom_header WHERE bom_id = $1 AND status = 'RELEASED' ORDER BY revision DESC LIMIT 1`,
      [bom_id]
    );

    const activeHeader = activeHeaders[0];
    let nextRev = newRevision;
    if (!nextRev) {
      nextRev = activeHeader ? getNextRevision(activeHeader.revision) : 'B';
    }

    // 2. Archive previous active revision
    if (activeHeader) {
      await this.recipeRepo.query(
        `UPDATE bom_header SET status = 'ARCHIVED', effective_to = $1 WHERE bom_id = $2 AND revision = $3`,
        [effective_from, bom_id, activeHeader.revision]
      );
    }

    const parentMat = parent_material || activeHeader?.parent_material;

    // 3. Insert new BOM revision as RELEASED
    await this.recipeRepo.query(
      `INSERT INTO bom_header (bom_id, parent_material, revision, effective_from, status)
       VALUES ($1, $2, $3, $4, 'RELEASED')`,
      [bom_id, parentMat, nextRev, effective_from]
    );

    // 4. Insert components for new revision
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const lineNo = c.line_no || c.lineNumber || (i + 1) * 10;
      await this.recipeRepo.query(
        `INSERT INTO bom_component (bom_id, revision, line_no, parent_material, component_material, component_type, qty, uom)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [bom_id, nextRev, lineNo, parentMat, c.component_material || c.component_code || c.componentCode, c.component_type || c.componentType || 'RAW', c.qty || c.quantity || 1.0, c.uom || 'PCS']
      );
    }

    return { success: true, bom_id, revision: nextRev, status: 'RELEASED' };
  }
}
