import { DispensingService } from './dispensing.service';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

/**
 * ============================================================================
 * MATERIALS CONTROLLER (REST API ENDPOINTS)
 * ============================================================================
 * @module MaterialsController
 * @description Exposes authenticated REST endpoints for raw material catalog management,
 * ISO/IEC 18004 2D QR code lookup, vendor qualification, Goods Receipt Note (GRN) inbound
 * docks, warehouse FEFO stock reservations, 21 CFR Part 11 dispensing, and consumption logs.
 * 
 * @security JWT Bearer Authentication via AuthGuard
 */
@Controller('materials')
@UseGuards(AuthGuard)
export class MaterialsController {
  @Get('locations')
  locations() { return this.materialsService.getStorageLocations(); }
  constructor(private dispensingService: DispensingService,private readonly materialsService: MaterialsService) {}

  // =========================================================================
  // SECTION 0: OPTICAL 2D QR CODE RESOLUTION & POKA-YOKE INGESTION
  // =========================================================================

  /**
   * @endpoint GET /materials/qr-lookup/:code
   * @description Resolves a 2D QR code string (either JSON serialized payload or raw SKU/Lot #)
   * into a complete MES traceability payload including Ingot Heat #, supplier, and inventory status.
   * 
   * @param {string} code - Scanned payload string
   * @returns {Promise<any>} Enriched batch or material specification
   */
  @Get('qr-lookup/:code')
  async lookupQrCode(@Param('code') code: string) {
    return this.materialsService.lookupQrCode(code);
  }

  // =========================================================================
  // SECTION 1: MATERIAL MASTER SPECIFICATION & IMAGE / STL ASSET UPLOADS
  // =========================================================================

  /**
   * @endpoint GET /materials
   * @description Retrieves the comprehensive raw material master catalog.
   * @returns {Promise<MaterialMaster[]>}
   */
  @Get()
  async getMaterials() {
    return this.materialsService.getMaterials();
  }

  /**
   * @endpoint POST /materials
   * @description Registers a new raw material SKU with multipart file upload support for
   * technical drawings (PNG/JPG) or 3D CAD models (STL).
   * 
   * @roles PRODUCTION_MANAGER, SUPERVISOR, QUALITY_ENGINEER, ADMIN
   * @param {any} dto - Material specification payload
   * @param {any} file - Optional uploaded image or 3D STL CAD file
   * @returns {Promise<MaterialMaster>}
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Post()
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|stl)$/i)) {
        return callback(new BadRequestException('Only JPG, PNG, and STL files are allowed!'), false);
      }
      callback(null, true);
    }
  }))
  async createMaterial(@Body() dto: any, @UploadedFile() file?: any) {
    if (file) {
      dto.imagePath = `/uploads/${file.filename}`;
    }
    
    // Parse numeric fields since they are parsed as strings in multipart form-data
    if (dto.shelfLifeDays) {
      dto.shelfLifeDays = parseInt(dto.shelfLifeDays, 10);
    }
    if (!dto.vendorId || dto.vendorId === '' || dto.vendorId === 'null' || dto.vendorId === 'undefined') {
      delete dto.vendorId;
    }
    
    return this.materialsService.createMaterial(dto);
  }

  /**
   * @endpoint PATCH /materials/:id
   * @description Modifies existing material master specifications and shelf life limits.
   * 
   * @roles PRODUCTION_MANAGER, SUPERVISOR, QUALITY_ENGINEER, ADMIN
   * @param {string} id - Material UUID or SKU code
   * @param {any} dto - Fields to update
   * @returns {Promise<MaterialMaster>}
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Patch(':id')
  async updateMaterial(@Param('id') id: string, @Body() dto: any) {
    if (dto.shelfLifeDays !== undefined && dto.shelfLifeDays !== null && dto.shelfLifeDays !== '') {
      dto.shelfLifeDays = parseInt(dto.shelfLifeDays, 10);
    }
    return this.materialsService.updateMaterial(id, dto);
  }

  /**
   * @endpoint DELETE /materials/:id
   * @description Removes a material master item if no foreign key constraints are locked.
   * 
   * @roles ADMIN, PRODUCTION_MANAGER
   * @param {string} id - Material UUID or SKU code
   * @returns {Promise<{ success: boolean; id: string }>}
   */
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  @Delete(':id')
  async deleteMaterial(@Param('id') id: string) {
    return this.materialsService.deleteMaterial(id);
  }

  // =========================================================================
  // SECTION 2: APPROVED VENDOR DIRECTORY
  // =========================================================================

  /**
   * @endpoint GET /materials/vendors
   * @description Fetches all qualified suppliers and tier-1 vendors.
   * @returns {Promise<Vendor[]>}
   */
  @Get('vendors')
  async getVendors() {
    return this.materialsService.getVendors();
  }

  /**
   * @endpoint POST /materials/vendors
   * @description Registers an approved vendor in the supply chain directory.
   * 
   * @roles PRODUCTION_MANAGER, ADMIN
   * @param {any} dto - Vendor information
   * @returns {Promise<Vendor>}
   */
  @Roles('PRODUCTION_MANAGER', 'ADMIN')
  @Post('vendors')
  async createVendor(@Body() dto: any) {
    return this.materialsService.createVendor(dto);
  }

  // =========================================================================
  // SECTION 3: GOODS RECEIPT NOTE (GRN) & INBOUND DOCK RECEIVING
  // =========================================================================

  /**
   * @endpoint GET /materials/grn
   * @description Fetches all Goods Receipt Notes with supplier and material linkages.
   * @returns {Promise<GoodsReceipt[]>}
   */
  @Get('grn')
  async getGoodsReceipts() {
    return this.materialsService.getGoodsReceipts();
  }

  /**
   * @endpoint POST /materials/grn
   * @description Logs inbound material delivery at the warehouse dock and auto-provisions lot if released.
   * 
   * @roles PRODUCTION_MANAGER, SUPERVISOR, QUALITY_ENGINEER, ADMIN, OPERATOR
   * @param {any} dto - GRN header and item details
   * @param {any} req - Request context containing authenticated user ID
   * @returns {Promise<GoodsReceipt>}
   * @compliance 21 CFR Part 11, GAMP 5
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN', 'OPERATOR')
  @Post('grn')
  async createGoodsReceipt(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.sub;
    return this.materialsService.createGoodsReceipt(userId, dto);
  }

  /**
   * @endpoint PATCH /materials/grn/:id/status
   * @description Updates GRN QA status (e.g. RELEASED, REJECTED, QUARANTINE).
   * 
   * @roles PRODUCTION_MANAGER, SUPERVISOR, QUALITY_ENGINEER, ADMIN
   * @param {string} id - GRN UUID
   * @param {string} status - Target status
   * @param {any} req - Request context with user ID
   * @returns {Promise<GoodsReceipt>}
   * @compliance 21 CFR Part 211.84 Quality Release
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Patch('grn/:id/status')
  async updateGrnStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('storageLocationId') storageLocationId: string,
    @Req() req: any
  ) {
    const userId = req.user?.sub;
    return this.materialsService.updateGrnStatus(userId, id, status, storageLocationId);
  }

  // =========================================================================
  // SECTION 4: WAREHOUSE STOCK BALANCES & FEFO ALLOCATION ENGINE
  // =========================================================================

  /**
   * @endpoint GET /materials/stock
   * @description Fetches active warehouse lot inventory balances ordered by expiration date.
   * @returns {Promise<MaterialInventory[]>}
   */
  @Get('stock')
  async getWarehouseStock() {
    return this.materialsService.getWarehouseStock();
  }

  /**
   * @endpoint POST /materials/allocate
   * @description First-Expired-First-Out (FEFO) stock reservation endpoint.
   * Calculates batch charges to satisfy the requested recipe charge.
   * 
   * @param {string} materialCode - SKU identifier
   * @param {number} requiredQty - Quantity demanded
   * @returns {Promise<any[]>} List of batch allocations
   * @compliance GAMP 5, IATF 16949 FIFO/FEFO
   */
  @Post('allocate')
  async allocateFEFOStock(@Body('materialCode') materialCode: string, @Body('requiredQty') requiredQty: number) {
    return this.materialsService.allocateFEFOStock(materialCode, requiredQty);
  }

  // =========================================================================
  // SECTION 5: SHELF LIFE & EXPIRY RISK SURVEILLANCE
  // =========================================================================

  /**
   * @endpoint GET /materials/expiry
   * @description Categorizes warehouse inventory into expired, 30-day, 60-day, and 90-day alert buckets.
   * @returns {Promise<any>}
   */
  @Get('expiry')
  async getExpiryWarnings() {
    return this.materialsService.getExpiryWarnings();
  }

  // =========================================================================
  // SECTION 6: HIGH-PRECISION WEIGHING & DISPENSING (DUAL SIGN-OFF)
  // =========================================================================

  /**
   * @endpoint GET /materials/dispensing
   * @description Retrieves dispensing logs with operator, QA verifier, and scale metrics.
   * @returns {Promise<DispensingRecord[]>}
   */
  @Get('dispensing')
  async getDispensingRecords() {
    return this.materialsService.getDispensingRecords();
  }

  /**
   * @endpoint POST /materials/dispensing
   * @description Records a high-precision material dispense with Mettler Toledo scale tare/gross capture,
   * 21 CFR Part 11 dual electronic signature verification, and container barcode association.
   * 
   * @roles OPERATOR, SUPERVISOR, ADMIN
   * @param {any} dto - Dispense payload with weighing records and verifier credentials
   * @param {any} req - Request context with line operator user ID
   * @returns {Promise<DispensingRecord>}
   * @compliance 21 CFR Part 11 Dual E-Signature, GAMP 5
   */
  @Roles('OPERATOR', 'SUPERVISOR', 'ADMIN')
  @Post('dispensing')
  async dispenseMaterial(@Body() dto: any, @Req() req: any) {
    const operatorId = req.user?.sub;
    return this.dispensingService.dispense(dto,req.headers['idempotency-key']);
  }

  // =========================================================================
  // SECTION 7: MATERIAL CONSUMPTION DASHBOARD
  // =========================================================================

  /**
   * @endpoint GET /materials/consumption
   * @description Fetches all actual consumption events and yield variances against work orders.
   * @returns {Promise<any[]>}
   */
  @Get('consumption')
  async getConsumptionSummary() {
    return this.materialsService.getConsumptionSummary();
  }

  // =========================================================================
  // SECTION 8: UNITS OF MEASURE (UOM) DICTIONARY
  // =========================================================================

  /**
   * @endpoint GET /materials/uoms
   * @description Fetches registered units of measure.
   * @returns {Promise<any[]>}
   */
  @Get('uoms')
  async getUoms() {
    return this.materialsService.getUoms();
  }

  /**
   * @endpoint POST /materials/uoms
   * @description Creates a new unit of measure.
   * 
   * @roles PRODUCTION_MANAGER, SUPERVISOR, QUALITY_ENGINEER, ADMIN
   * @param {any} dto - { code, name }
   * @returns {Promise<any>}
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Post('uoms')
  async createUom(@Body() dto: any) {
    return this.materialsService.createUom(dto);
  }

  // =========================================================================
  // SECTION 9: MATERIAL TYPES & CONSUMPTION LOGGING
  // =========================================================================

  /**
   * @endpoint GET /materials/types
   * @description Lists all defined material categories.
   * @returns {Promise<any[]>}
   */
  @Get('types')
  async getMaterialTypes() {
    return this.materialsService.getMaterialTypes();
  }

  /**
   * @endpoint POST /materials/types
   * @description Registers an enterprise material classification code.
   * 
   * @roles PRODUCTION_MANAGER, SUPERVISOR, QUALITY_ENGINEER, ADMIN
   * @param {any} dto - { code, description }
   * @returns {Promise<any>}
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Post('types')
  async createMaterialType(@Body() dto: any) {
    return this.materialsService.createMaterialType(dto);
  }

  /**
   * @endpoint POST /materials/consumption
   * @description Logs material consumption against a work order with planned vs actual variance.
   * 
   * @roles PRODUCTION_MANAGER, SUPERVISOR, OPERATOR, ADMIN
   * @param {any} dto - Consumption data
   * @returns {Promise<MaterialConsumption>}
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'OPERATOR', 'ADMIN')
  @Post('consumption')
  async logConsumption(@Body() dto: any) {
    return this.materialsService.logConsumption(dto);
  }
}
