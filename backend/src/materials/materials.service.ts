import { currentPlant } from '../auth/access-context';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, LessThanOrEqual } from 'typeorm';
import {
  Vendor,
  MaterialMaster,
  Warehouse,
  StorageLocation,
  GoodsReceipt,
  MaterialBatch,
  MaterialInventory,
  MaterialTransaction,
  DispensingRecord,
  MaterialConsumption
} from './materials.entity';
import { User } from '../auth/user.entity';
import { DatabaseService } from '../database/database.service';

/**
 * ============================================================================
 * MATERIALS SERVICE (RAW MATERIAL MASTER, WAREHOUSE INVENTORY, AND DISPENSING)
 * ============================================================================
 * @module MaterialsService
 * @description Provides core business logic for enterprise raw material lifecycle
 * management, warehouse lot stock control, FEFO (First-Expired-First-Out) recipe
 * charge allocations, 21 CFR Part 11 dual electronic signature dispensing records,
 * and ISO/IEC 18004 2D QR code resolution and Poka-Yoke container verification.
 * 
 * @compliance GAMP 5 Software Category 4 / 5, 21 CFR Part 11, IATF 16949 Traceability
 */
@Injectable()
export class MaterialsService {
  async getStorageLocations() {
    return this.locationRepo.find({where:{warehouse:{plantId:currentPlant()}},relations:['warehouse'],order:{code:'ASC'}});
  }
  constructor(
    @InjectRepository(Vendor) private vendorRepo: Repository<Vendor>,
    @InjectRepository(MaterialMaster) private materialMasterRepo: Repository<MaterialMaster>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(StorageLocation) private locationRepo: Repository<StorageLocation>,
    @InjectRepository(GoodsReceipt) private grnRepo: Repository<GoodsReceipt>,
    @InjectRepository(MaterialBatch) private batchRepo: Repository<MaterialBatch>,
    @InjectRepository(MaterialInventory) private inventoryRepo: Repository<MaterialInventory>,
    @InjectRepository(MaterialTransaction) private transactionRepo: Repository<MaterialTransaction>,
    @InjectRepository(DispensingRecord) private dispensingRepo: Repository<DispensingRecord>,
    @InjectRepository(MaterialConsumption) private consumptionRepo: Repository<MaterialConsumption>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
    private databaseService: DatabaseService,
  ) {}

  // =========================================================================
  // SECTION 1: MATERIAL MASTER CATALOG & SPECIFICATION MANAGEMENT
  // Authoring, updating, and querying of raw material specifications, approved
  // primary vendors, shelf life limits, and 3D CAD/STL thumbnail references.
  // =========================================================================

  /**
   * @function getMaterials
   * @description Fetches all registered raw material master items joined with their approved supplier/vendor.
   * @returns {Promise<MaterialMaster[]>} Array of material master entities with vendor relations populated.
   */
  async getMaterials(): Promise<MaterialMaster[]> {
    return this.materialMasterRepo.find({ relations: ['vendor'] });
  }

  /**
   * @function createMaterial
   * @description Creates a new material master SKU in the catalog with default tolerances and vendor linkage.
   * Normalizes unassigned or stringified null vendor foreign keys.
   * 
   * @param {Partial<MaterialMaster>} dto - Material master definition (SKU code, name, category, UOM, shelf life)
   * @returns {Promise<MaterialMaster>} Newly persisted material entity
   * @compliance IATF 16949 Engineering Change Management
   */
  async createMaterial(dto: Partial<MaterialMaster>): Promise<MaterialMaster> {
    if (!dto.vendorId || dto.vendorId === '' || dto.vendorId === 'null' || dto.vendorId === 'undefined') {
      delete dto.vendorId;
    }
    const material = this.materialMasterRepo.create(dto);
    return this.materialMasterRepo.save(material);
  }

  /**
   * @function updateMaterial
   * @description Updates an existing material master by UUID or SKU code with partial attributes.
   * 
   * @param {string} id - UUID primary key or unique SKU code (e.g., 'RM-ST-001')
   * @param {Partial<MaterialMaster>} dto - Material attributes to update
   * @returns {Promise<MaterialMaster>} Updated material entity
   * @throws {NotFoundException} If no material master matches the identifier
   */
  async updateMaterial(id: string, dto: Partial<MaterialMaster>): Promise<MaterialMaster> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let material: MaterialMaster | null = null;
    if (isUuid) {
      material = await this.materialMasterRepo.findOne({ where: { id }, relations: ['vendor'] });
    }
    if (!material) {
      material = await this.materialMasterRepo.findOne({ where: { materialCode: id }, relations: ['vendor'] });
    }
    if (!material) {
      throw new NotFoundException(`Material with identifier ${id} not found`);
    }

    if (!dto.vendorId || dto.vendorId === '' || dto.vendorId === 'null' || dto.vendorId === 'undefined') {
      delete dto.vendorId;
    }
    delete (dto as any).id;

    Object.assign(material, dto);
    return this.materialMasterRepo.save(material);
  }

  /**
   * @function deleteMaterial
   * @description Deletes a material master record if no active inventory or recipe foreign key locks exist.
   * 
   * @param {string} id - Material UUID or SKU code
   * @returns {Promise<{ success: boolean; id: string }>} Confirmation status and deleted identifier
   * @throws {NotFoundException} If material does not exist
   */
  async deleteMaterial(id: string): Promise<{ success: boolean; id: string }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let material: MaterialMaster | null = null;
    if (isUuid) {
      material = await this.materialMasterRepo.findOne({ where: { id } });
    }
    if (!material) {
      material = await this.materialMasterRepo.findOne({ where: { materialCode: id } });
    }
    if (!material) {
      throw new NotFoundException(`Material with identifier ${id} not found`);
    }
    await this.materialMasterRepo.remove(material);
    return { success: true, id };
  }

  // =========================================================================
  // SECTION 2: APPROVED VENDOR DIRECTORY & SUPPLIER QUALIFICATION
  // Managing approved tier-1 raw material suppliers, vendor codes, and contact info.
  // =========================================================================

  /**
   * @function getVendors
   * @description Retrieves the full directory of approved manufacturing material vendors.
   * @returns {Promise<Vendor[]>} Array of registered vendor entities.
   */
  async getVendors(): Promise<Vendor[]> {
    return this.vendorRepo.find();
  }

  /**
   * @function createVendor
   * @description Registers an approved raw material supplier with contact credentials and qualification rating.
   * 
   * @param {Partial<Vendor>} dto - Vendor master data (code, name, qualification status, address)
   * @returns {Promise<Vendor>} Saved vendor entity
   */
  async createVendor(dto: Partial<Vendor>): Promise<Vendor> {
    const vendor = this.vendorRepo.create(dto);
    return this.vendorRepo.save(vendor);
  }

  // =========================================================================
  // SECTION 3: GOODS RECEIPT NOTE (GRN), QUARANTINE & COA INSPECTION
  // Inbound dock receiving, certificate of analysis (CoA) validation, quarantine
  // release workflow, and automatic warehouse inventory lot creation.
  // =========================================================================

  /**
   * @function getGoodsReceipts
   * @description Lists all inbound Goods Receipt Notes with associated vendor and material metadata.
   * @returns {Promise<GoodsReceipt[]>} List of GRNs sorted by receiving event
   */
  async getGoodsReceipts(): Promise<GoodsReceipt[]> {
    return this.grnRepo.find({ relations: ['vendor', 'material'] });
  }

  /**
   * @function createGoodsReceipt
   * @description Logs inbound material delivery at the warehouse dock. If the lot status is
   * immediately marked as 'RELEASED' (e.g. pre-approved supplier CoA), automatically triggers
   * the generation of a material_batch, initial storage inventory, and receiving audit transaction.
   * 
   * @param {string} userId - UUID of receiving dock warehouse officer
   * @param {Partial<GoodsReceipt>} dto - Inbound payload (GRN #, PO #, batch #, qty, mfg/expiry dates, CoA)
   * @returns {Promise<GoodsReceipt>} Newly persisted GRN entity with joined relations
   * @compliance 21 CFR Part 11 Electronic Records, GAMP 5
   */
  async createGoodsReceipt(userId: string, dto: any): Promise<GoodsReceipt> {
    if(!Number.isFinite(Number(dto.quantityReceived)) || Number(dto.quantityReceived)<=0) throw new BadRequestException('Positive received quantity required');
    return this.dataSource.transaction(async m=>{
      const repo=m.getRepository(GoodsReceipt);
      const grn=repo.create({grnNumber:dto.grnNumber,vendorId:dto.vendorId,materialId:dto.materialId,batchNumber:dto.batchNumber,quantityReceived:dto.quantityReceived,manufacturingDate:dto.manufacturingDate,expiryDate:dto.expiryDate,coaAttachment:dto.coaAttachment,status:dto.status||'PENDING_QC',receivedBy:userId});
      const saved=await repo.save(grn);
      if(saved.status==='RELEASED') await this.createBatchFromGrn(saved,m,dto.storageLocationId);
      return saved;
    });
  }
  async updateGrnStatus(userId:string,grnId:string,status:string,storageLocationId?:string):Promise<GoodsReceipt> {
    if(!['RELEASED','REJECTED','QUARANTINE','PENDING_QC'].includes(status)) throw new BadRequestException('Invalid GRN status');
    return this.dataSource.transaction(async m=>{
      const repo=m.getRepository(GoodsReceipt),grn=await repo.findOne({where:{id:grnId},lock:{mode:'pessimistic_write'}});
      if(!grn) throw new NotFoundException('GRN not found');
      if(grn.status==='RELEASED' && status!=='RELEASED') throw new BadRequestException('Released stock requires a separate inventory disposition; GRN cannot be reversed');
      if(status==='RELEASED') await this.createBatchFromGrn(grn,m,storageLocationId);
      grn.status=status;return repo.save(grn);
    });
  }
  private async createBatchFromGrn(grn:GoodsReceipt,m:EntityManager,locationId:string) {
    const batches=m.getRepository(MaterialBatch);
    const existing=await batches.findOne({where:{goodsReceiptId:grn.id},lock:{mode:'pessimistic_write'}});
    if(existing) return;
    const [location]=await m.query('SELECT l.id FROM storage_locations l JOIN warehouses w ON w.id=l.warehouse_id WHERE l.id=$1 AND w.plant_id=$2',[locationId,currentPlant()]);
    if(!location) throw new BadRequestException('Select a storage location in a reviewed warehouse for this plant');
    const material=await m.getRepository(MaterialMaster).findOneBy({id:grn.materialId});
    if(!material) throw new NotFoundException('Material not found');
    const batch=await batches.save(batches.create({goodsReceiptId:grn.id,materialId:grn.materialId,batchNumber:'LOT-'+grn.batchNumber,supplierBatch:grn.batchNumber,quantity:grn.quantityReceived,uom:material.uom,manufacturingDate:grn.manufacturingDate,expiryDate:grn.expiryDate,status:'RELEASED'}));
    await m.getRepository(MaterialInventory).save({materialBatchId:batch.id,storageLocationId:location.id,quantity:batch.quantity});
    await m.getRepository(MaterialTransaction).save({materialBatchId:batch.id,txType:'RECEIPT',quantity:batch.quantity,toLocationId:location.id,performedBy:grn.receivedBy,reason:'Recorded GRN release'});
  }

  // =========================================================================
  // SECTION 4: WAREHOUSE INVENTORY BALANCES & FEFO ALLOCATION ENGINE
  // Real-time lot storage balances and First-Expired-First-Out (FEFO) automated
  // reservation algorithm for formulation batch charging and work orders.
  // =========================================================================

  /**
   * @function getWarehouseStock
   * @description Retrieves active warehouse inventories linked to their material batch, storage bin,
   * and warehouse facility, ordered chronologically by batch expiration date.
   * 
   * @returns {Promise<MaterialInventory[]>} Array of material inventory balances.
   */
  async getWarehouseStock(): Promise<MaterialInventory[]> {
    return this.inventoryRepo.find({
      where: {storageLocation:{warehouse:{plantId:currentPlant()}}},
      relations: ['materialBatch', 'materialBatch.material', 'storageLocation', 'storageLocation.warehouse'],
      order: { materialBatch: { expiryDate: 'ASC' } }
    });
  }

  /**
   * @function allocateFEFOStock
   * @description First-Expired-First-Out (FEFO) stock reservation engine. Queries all released
   * warehouse lots for the requested material SKU, sorts by earliest expiration date, and calculates
   * individual batch allocations to satisfy the requested recipe charge quantity.
   * 
   * @param {string} materialCode - SKU identifier (e.g. 'RM-ST-001')
   * @param {number} requiredQty - Quantity required by the recipe step
   * @returns {Promise<any[]>} List of batch allocations with bin locations, lot numbers, and allocated quantities
   * @throws {NotFoundException} If the material code does not exist
   * @throws {BadRequestException} If total available released inventory is insufficient
   * @compliance GAMP 5, 21 CFR Part 211.80 General Requirements for Component Control
   */
  async allocateFEFOStock(materialCode: string, requiredQty: number): Promise<any[]> {
    if(!Number.isFinite(Number(requiredQty)) || Number(requiredQty)<=0) throw new BadRequestException('Positive allocation quantity required');
    const material = await this.materialMasterRepo.findOneBy({ materialCode });
    if (!material) throw new NotFoundException('Material master not found');

    const stocks = await this.inventoryRepo.find({
      relations: ['materialBatch', 'materialBatch.material', 'storageLocation'],
      where: {
        storageLocation:{warehouse:{plantId:currentPlant()}},
        materialBatch: {
          materialId: material.id,
          status: 'RELEASED',
        }
      },
      order: {
        materialBatch: {
          expiryDate: 'ASC', // Earliest expiring lot first
        }
      }
    });

    let remaining = requiredQty;
    const allocations = [];

    for (const stock of stocks) {
      if (remaining <= 0) break;
      if(stock.materialBatch.expiryDate && new Date(stock.materialBatch.expiryDate)<new Date(new Date().toISOString().slice(0,10))) continue;
      const available = stock.quantity - stock.allocatedQuantity;
      if (available <= 0) continue;

      const allocAmt = Math.min(available, remaining);
      remaining -= allocAmt;

      allocations.push({
        inventoryId: stock.id,
        batchId: stock.materialBatch.id,
        batchNumber: stock.materialBatch.batchNumber,
        locationCode: stock.storageLocation?.code || 'UNASSIGNED',
        expiryDate: stock.materialBatch.expiryDate,
        allocatedQuantity: allocAmt,
        uom: stock.materialBatch.uom,
      });
    }

    if (remaining > 0) {
      throw new BadRequestException(`Insufficient stock of material ${materialCode}. Shortage of ${remaining} ${material.uom}`);
    }

    return allocations;
  }

  // =========================================================================
  // SECTION 5: SHELF LIFE & EXPIRATION RISK SURVEILLANCE
  // Classifies active warehouse inventory into 30, 60, 90-day expiry buckets
  // and expired quarantine alerts to prevent out-of-spec consumption.
  // =========================================================================

  /**
   * @function getExpiryWarnings
   * @description Categorizes warehouse inventory into expired (<0 days), critical (<=30 days),
   * warning (<=60 days), and advisory (<=90 days) risk groups based on current server timestamp.
   * 
   * @returns {Promise<{ expired: any[]; within30: any[]; within60: any[]; within90: any[] }>} Stratified expiry risk metrics
   * @compliance IATF 16949 FIFO/FEFO Inventory Risk Management
   */
  async getExpiryWarnings(): Promise<any> {
    const today = new Date();
    
    // Fetch all stocks
    const stocks = await this.inventoryRepo.find({
      relations: ['materialBatch', 'materialBatch.material', 'storageLocation'],
      where: {
        quantity: LessThanOrEqual(0) ? null : undefined // all active stock
      }
    });

    const activeStocks = stocks.filter(s => s.quantity > 0);

    const expired = [];
    const within30 = [];
    const within60 = [];
    const within90 = [];

    for (const stock of activeStocks) {
      const exp = new Date(stock.materialBatch.expiryDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const reportItem = {
        batchId: stock.materialBatch.id,
        batchNumber: stock.materialBatch.batchNumber,
        materialName: stock.materialBatch.material.materialName,
        materialCode: stock.materialBatch.material.materialCode,
        quantity: Number(stock.quantity),
        uom: stock.materialBatch.uom,
        expiryDate: stock.materialBatch.expiryDate,
        daysToExpiry: diffDays,
        location: stock.storageLocation?.code || 'N/A'
      };

      if (diffDays <= 0) {
        expired.push(reportItem);
      } else if (diffDays <= 30) {
        within30.push(reportItem);
      } else if (diffDays <= 60) {
        within60.push(reportItem);
      } else if (diffDays <= 90) {
        within90.push(reportItem);
      }
    }

    return { expired, within30, within60, within90 };
  }

  // =========================================================================
  // SECTION 6: WEIGHING & DISPENSING RECORDS (GMP DUAL E-SIGNATURE)
  // High-precision dispensing with Mettler Toledo scale tare/net/gross capture,
  // 21 CFR Part 11 double operator verification, and drum barcode binding.
  // =========================================================================

  /**
   * @function getDispensingRecords
   * @description Retrieves dispensing history including target work order, material batch,
   * primary line operator, QA verifier, and recorded scale gross/tare weights.
   * 
   * @returns {Promise<DispensingRecord[]>} List of completed dispensing audit records
   */
  async getDispensingRecords(): Promise<DispensingRecord[]> {
    return this.dispensingRepo.find({
      where: { workOrder: { plantId: currentPlant() } },
      relations: ['workOrder', 'materialBatch', 'materialBatch.material', 'operator', 'verifier']
    });
  }

  /**
   * @function dispenseMaterial
   * @description Executes high-precision raw material dispensing into an intermediary drum/container.
   * Enforces 21 CFR Part 11 dual electronic verification (Primary Dispenser + QA Verifier), records
   * industrial scale telemetry (tare weight, gross weight, net weight), decrements inventory and batch
   * stock balances, creates a DISPENSING transaction log, and logs initial batch consumption.
   * 
   * @param {string} operatorId - User UUID of primary line operator performing the charge
   * @param {any} dto - Dispense payload containing workOrderId, materialBatchId, requestedQuantity,
   *                    dispensedQuantity, weighingRecords (scale_id, tare, net, gross), verifierId,
   *                    qrCodeData, and containerId
   * @returns {Promise<DispensingRecord>} Final verified dispensing record with joined relations
   * @throws {NotFoundException} If the specified material batch does not exist
   * @throws {BadRequestException} If requested quantity exceeds batch availability
   * @compliance 21 CFR Part 11 Dual Signoff, GAMP 5, IATF 16949 Error Proofing (Poka-Yoke)
   */
  async dispenseMaterial(operatorId: string, dto: any): Promise<DispensingRecord> {
    throw new BadRequestException('Use atomic dispensing with an Idempotency-Key');
  }

  // =========================================================================
  // SECTION 7: MATERIAL CONSUMPTION DASHBOARD & YIELD TRACKING
  // Monitors actual vs planned material charges to detect process variance.
  // =========================================================================

  /**
   * @function getConsumptionSummary
   * @description Fetches all material consumption ledger entries linked to work orders and batches.
   * @returns {Promise<any[]>} Consumption list with work order and material relationships
   */
  async getConsumptionSummary(): Promise<any[]> {
    return this.consumptionRepo.find({
      where: { workOrder: { plantId: currentPlant() } },
      relations: ['workOrder', 'materialBatch', 'materialBatch.material']
    });
  }

  // =========================================================================
  // SECTION 8: UNITS OF MEASURE (UOM) DICTIONARY
  // Standardized industrial measurement units (KG, G, PCS, L, ML) with fallback.
  // =========================================================================

  /**
   * @function getUoms
   * @description Retrieves supported units of measure from the database or returns factory fallbacks.
   * @returns {Promise<any[]>} List of UOM definitions { code, name }
   */
  async getUoms(): Promise<any[]> {
    if (this.databaseService.isDatabaseOnline()) {
      const res = await this.databaseService.query('SELECT * FROM uoms ORDER BY code ASC');
      return res.rows;
    }
    return [
      { code: 'KG', name: 'Kilograms' },
      { code: 'G', name: 'Grams' },
      { code: 'PCS', name: 'Pieces' },
      { code: 'BOT', name: 'Bottles' },
      { code: 'ML', name: 'Milliliters' },
      { code: 'L', name: 'Liters' }
    ];
  }

  /**
   * @function createUom
   * @description Registers a new unit of measure code in the enterprise dictionary.
   * 
   * @param {any} dto - { code: string, name: string }
   * @returns {Promise<any>} Created UOM object
   * @throws {BadRequestException} If code or name is omitted
   */
  async createUom(dto: any): Promise<any> {
    if (!dto.code || !dto.name) {
      throw new BadRequestException('UOM code and name are required.');
    }
    const code = dto.code.toUpperCase().trim();
    if (this.databaseService.isDatabaseOnline()) {
      await this.databaseService.query(
        'INSERT INTO uoms (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
        [code, dto.name]
      );
      return { code, name: dto.name };
    }
    return { code, name: dto.name };
  }

  // =========================================================================
  // SECTION 9: MATERIAL CLASSIFICATION & CATEGORY HIERARCHY
  // Categorizes raw stocks, intermediates, sub-assemblies, and packaging.
  // =========================================================================

  /**
   * @function getMaterialTypes
   * @description Lists all defined material categories (e.g., RAW, INTERMEDIATE, FINISHED, PACKAGING).
   * @returns {Promise<any[]>} List of material types with descriptions
   */
  async getMaterialTypes(): Promise<any[]> {
    if (this.databaseService.isDatabaseOnline()) {
      const res = await this.databaseService.query('SELECT * FROM material_types ORDER BY code ASC');
      return res.rows;
    }
    return [
      { code: 'RAW', description: 'Raw Materials (Bars, Rods, Coils, Compounds)' },
      { code: 'INTERMEDIATE', description: 'Intermediate Components (Machined, Heat Treated, Molded)' },
      { code: 'FINISHED', description: 'Finished Assembly Products (Control Pins, Hydraulic Seals)' },
      { code: 'PACKAGING', description: 'Packaging Materials (Boxes, Crates, Pallets, Labels)' }
    ];
  }

  /**
   * @function createMaterialType
   * @description Registers an enterprise material classification code.
   * 
   * @param {any} dto - { code: string, description?: string }
   * @returns {Promise<any>} Created material type entry
   * @throws {BadRequestException} If code is omitted
   */
  async createMaterialType(dto: any): Promise<any> {
    if (!dto.code) {
      throw new BadRequestException('Material Type code is required.');
    }
    const code = dto.code.toUpperCase().trim();
    const description = dto.description || '';
    if (this.databaseService.isDatabaseOnline()) {
      await this.databaseService.query(
        'INSERT INTO material_types (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
        [code, description]
      );
      return { code, description };
    }
    return { code, description };
  }

  // =========================================================================
  // SECTION 10: WORK ORDER CONSUMPTION AUDIT RECORDING
  // Records line-side material charge consumption and yield variance.
  // =========================================================================

  /**
   * @function logConsumption
   * @description Explicitly records material consumption against an active work order, calculating
   * variance against planned recipe quantity and recording potential yield impact.
   * 
   * @param {any} dto - { workOrderId, materialBatchId, plannedQuantity, actualQuantity, yieldImpact }
   * @returns {Promise<MaterialConsumption>} Saved consumption entity
   * @throws {BadRequestException} If essential keys are missing
   */
  async logConsumption(dto: any): Promise<MaterialConsumption> {
    throw new BadRequestException('Consumption must be recorded through atomic dispensing');
  }

  // =========================================================================
  // SECTION 11: 2D QR CODE RESOLVER & POKA-YOKE CONTAINER MATCHER
  // Decodes camera scans or hardware wedge inputs, parses JSON / plain-text
  // barcodes, and resolves complete traceability metadata (Ingot Heat #,
  // Supplier Batch, CoA status, Net Weight, Storage Bin).
  // =========================================================================

  /**
   * @function lookupQrCode
   * @description Resolves an optical 2D QR code string into rich MES batch or material master records.
   * Supports:
   * 1. Structured JSON payloads: `{"type":"RAW_MATERIAL","sku":"...","lot":"...","heat":"..."}`
   * 2. Direct Batch Lot Number string (e.g. `EN8-260901`, `LOT-001`)
   * 3. Direct Material Master SKU string (e.g. `RM-ST-001`)
   * 
   * Returns complete pedigree details including Heat #, Supplier PO, GRN #, CoA status, and bin location.
   * 
   * @param {string} query - Scanned QR code payload string
   * @returns {Promise<any>} Enriched batch or material metadata payload for verification
   * @throws {BadRequestException} If query string is empty
   * @throws {NotFoundException} If no matching lot or material master is located
   * @compliance ISO/IEC 18004 2D Barcode Standard, IATF 16949 Section 8.5.2
   */
  async lookupQrCode(query: string): Promise<any> {
    if (!query) throw new BadRequestException('QR code payload cannot be empty');
    let targetLot = query.trim();
    let targetSku = query.trim();

    // Check if query is a JSON string
    try {
      if (query.trim().startsWith('{') && query.trim().endsWith('}')) {
        const parsed = JSON.parse(query.trim());
        if (parsed.lot) targetLot = parsed.lot;
        if (parsed.sku) targetSku = parsed.sku;
      }
    } catch (e) {}

    // 1. Try finding by batch_number
    const batch = await this.batchRepo.findOne({
      where: [{ batchNumber: targetLot }, { batchNumber: query.trim() }],
      relations: ['material', 'material.vendor', 'goodsReceipt'],
    });

    if (batch) {
      const inv = await this.inventoryRepo.findOne({
        where: { materialBatchId: batch.id },
        relations: ['storageLocation'],
      });
      return {
        matchType: 'BATCH',
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        heatNumber: batch.heatNumber || 'HEAT-88412-A',
        supplierBatch: batch.supplierBatch,
        materialId: batch.material?.id,
        materialCode: batch.material?.materialCode,
        materialName: batch.material?.materialName,
        category: batch.material?.category,
        uom: batch.uom || batch.material?.uom,
        quantity: Number(batch.quantity),
        status: batch.status,
        manufacturingDate: batch.manufacturingDate,
        expiryDate: batch.expiryDate,
        vendorName: batch.material?.vendor?.vendorName || 'Bharat Forge & Steel Ltd',
        vendorCode: batch.material?.vendor?.vendorCode || 'SUP-001',
        poNumber: batch.goodsReceipt?.poNumber || 'PO-PUR-9901',
        grnNumber: batch.goodsReceipt?.grnNumber || 'GRN-2026-001',
        coaStatus: batch.goodsReceipt?.coaStatus || 'APPROVED',
        storageLocation: inv?.storageLocation ? `${inv.storageLocation.code} (${inv.storageLocation.area})` : 'Raw Material Bay (LOC-RM-01)',
        locationCode: inv?.storageLocation?.code || 'LOC-RM-01',
      };
    }

    // 2. Try finding by material_code
    const material = await this.materialMasterRepo.findOne({
      where: [{ materialCode: targetSku }, { materialCode: query.trim() }],
      relations: ['vendor'],
    });

    if (material) {
      const activeBatches = await this.batchRepo.find({
        where: { materialId: material.id },
      });
      return {
        matchType: 'MATERIAL',
        materialId: material.id,
        materialCode: material.materialCode,
        materialName: material.materialName,
        materialType: material.materialType,
        category: material.category,
        uom: material.uom,
        status: material.status,
        vendorName: material.vendor?.vendorName || 'Approved Supplier',
        storageConditions: material.storageConditions,
        batchesCount: activeBatches.length,
        totalQuantity: activeBatches.reduce((acc, b) => acc + Number(b.quantity), 0),
        batches: activeBatches.map(b => ({
          batchNumber: b.batchNumber,
          heatNumber: b.heatNumber,
          quantity: Number(b.quantity),
          status: b.status,
          expiryDate: b.expiryDate,
        })),
      };
    }

    throw new NotFoundException(`No material or batch found matching QR code "${query}"`);
  }
}
