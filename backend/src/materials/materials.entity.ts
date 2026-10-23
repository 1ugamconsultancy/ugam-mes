import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/user.entity';
import { WorkOrder } from '../work-orders/work-orders.entity';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendor_code', length: 50, unique: true })
  vendorCode: string;

  @Column({ name: 'vendor_name', length: 255 })
  vendorName: string;

  @Column({ name: 'qualification_status', length: 50 }) // 'QUALIFIED', 'PROVISIONAL', 'DISQUALIFIED'
  qualificationStatus: string;

  @Column({ name: 'audit_date', type: 'date', nullable: true })
  auditDate: Date;

  @Column({ name: 'contact_information', type: 'text', nullable: true })
  contactInformation: string;

  @Column({ name: 'approved_materials', type: 'jsonb', nullable: true })
  approvedMaterials: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('material_master')
export class MaterialMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'material_code', length: 100, unique: true })
  materialCode: string;

  @Column({ name: 'material_name', length: 255 })
  materialName: string;

  @Column({ name: 'material_type', length: 50 }) // 'API', 'EXCIPIENT', 'RAW_MATERIAL', 'PACKAGING', 'LABEL', 'SEMI_FINISHED', 'FINISHED'
  materialType: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ length: 20 })
  uom: string;

  @Column({ length: 255, nullable: true })
  manufacturer: string;

  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string;

  @ManyToOne(() => Vendor, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'shelf_life_days', type: 'integer', nullable: true })
  shelfLifeDays: number;

  @Column({ name: 'storage_conditions', length: 255, nullable: true })
  storageConditions: string;

  @Column({ length: 50, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'image_path', length: 255, nullable: true })
  imagePath: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('warehouses')
export class Warehouse {
 @Column({name:'plant_id',type:'uuid',nullable:true}) plantId:string;
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  location: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('storage_locations')
export class StorageLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ length: 100 }) // 'RAW_MAT', 'QUARANTINE', 'RELEASED', 'REJECTED'
  area: string;

  @Column({ length: 50, nullable: true })
  rack: string;

  @Column({ length: 50, nullable: true })
  bin: string;

  @Column({ length: 100, unique: true })
  code: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'grn_number', length: 50, unique: true })
  grnNumber: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'material_id', type: 'uuid' })
  materialId: string;

  @ManyToOne(() => MaterialMaster)
  @JoinColumn({ name: 'material_id' })
  material: MaterialMaster;

  @Column({ name: 'batch_number', length: 100 })
  batchNumber: string;

  @Column({ name: 'quantity_received', type: 'decimal', precision: 12, scale: 4 })
  quantityReceived: number;

  @Column({ name: 'manufacturing_date', type: 'date' })
  manufacturingDate: Date;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: Date;

  @Column({ name: 'coa_attachment', length: 255, nullable: true })
  coaAttachment: string;

  @Column({ name: 'po_number', length: 100, nullable: true, default: 'PO-PUR-9901' })
  poNumber: string;

  @Column({ name: 'coa_status', length: 50, nullable: true, default: 'APPROVED' })
  coaStatus: string;

  @Column({ length: 50, default: 'PENDING_QC' }) // 'PENDING_QC', 'RELEASED', 'REJECTED', 'QUARANTINED'
  status: string;

  @Column({ name: 'received_by', type: 'uuid', nullable: true })
  receivedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'received_by' })
  receiver: User;

  @CreateDateColumn({ name: 'received_at', type: 'timestamp with time zone' })
  receivedAt: Date;
}

@Entity('material_batches')
export class MaterialBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'goods_receipt_id', type: 'uuid', nullable: true })
  goodsReceiptId: string;

  @ManyToOne(() => GoodsReceipt, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: GoodsReceipt;

  @Column({ name: 'material_id', type: 'uuid' })
  materialId: string;

  @ManyToOne(() => MaterialMaster)
  @JoinColumn({ name: 'material_id' })
  material: MaterialMaster;

  @Column({ name: 'batch_number', length: 100, unique: true })
  batchNumber: string;

  @Column({ name: 'supplier_batch', length: 100, nullable: true })
  supplierBatch: string;

  @Column({ name: 'heat_number', length: 100, nullable: true })
  heatNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number;

  @Column({ length: 20 })
  uom: string;

  @Column({ name: 'manufacturing_date', type: 'date', nullable: true })
  manufacturingDate: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ length: 50, default: 'QUARANTINE' }) // 'QUARANTINE', 'RELEASED', 'REJECTED', 'EXPIRED'
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('material_inventory')
export class MaterialInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'material_batch_id', type: 'uuid' })
  materialBatchId: string;

  @ManyToOne(() => MaterialBatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_batch_id' })
  materialBatch: MaterialBatch;

  @Column({ name: 'storage_location_id', type: 'uuid', nullable: true })
  storageLocationId: string;

  @ManyToOne(() => StorageLocation, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'storage_location_id' })
  storageLocation: StorageLocation;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0.0000 })
  quantity: number;

  @Column({ name: 'allocated_quantity', type: 'decimal', precision: 12, scale: 4, default: 0.0000 })
  allocatedQuantity: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}

@Entity('material_transactions')
export class MaterialTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'material_batch_id', type: 'uuid' })
  materialBatchId: string;

  @ManyToOne(() => MaterialBatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_batch_id' })
  materialBatch: MaterialBatch;

  @Column({ name: 'tx_type', length: 50 }) // 'RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'REJECTION', 'DISPENSING'
  txType: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number;

  @Column({ name: 'from_location_id', type: 'uuid', nullable: true })
  fromLocationId: string;

  @ManyToOne(() => StorageLocation)
  @JoinColumn({ name: 'from_location_id' })
  fromLocation: StorageLocation;

  @Column({ name: 'to_location_id', type: 'uuid', nullable: true })
  toLocationId: string;

  @ManyToOne(() => StorageLocation)
  @JoinColumn({ name: 'to_location_id' })
  toLocation: StorageLocation;

  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performed_by' })
  performer: User;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp: Date;
}

@Entity('dispensing_records')
export class DispensingRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId: string;

  @ManyToOne(() => WorkOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'material_batch_id', type: 'uuid' })
  materialBatchId: string;

  @ManyToOne(() => MaterialBatch)
  @JoinColumn({ name: 'material_batch_id' })
  materialBatch: MaterialBatch;

  @Column({ name: 'requested_quantity', type: 'decimal', precision: 12, scale: 4 })
  requestedQuantity: number;

  @Column({ name: 'dispensed_quantity', type: 'decimal', precision: 12, scale: 4 })
  dispensedQuantity: number;

  @Column({ name: 'balance_quantity', type: 'decimal', precision: 12, scale: 4 })
  balanceQuantity: number;

  @Column({ name: 'weighing_records', type: 'jsonb' })
  weighingRecords: any; // { scale_id: string, tare_weight_g: number, gross_weight_g: number, net_weight_g: number }

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ name: 'verifier_id', type: 'uuid', nullable: true })
  verifierId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'verifier_id' })
  verifier: User;

  @Column({ name: 'verified_at', type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date;

  @Column({ name: 'signature_id', type: 'uuid', nullable: true })
  signatureId: string;

  @Column({ name: 'qr_code_data', type: 'text', nullable: true })
  qrCodeData: string;

  @Column({ name: 'container_id', length: 100, nullable: true })
  containerId: string;

  @Column({ length: 50, default: 'VERIFIED' }) // 'IN_PROGRESS', 'VERIFIED', 'REJECTED'
  status: string;

  @CreateDateColumn({ name: 'dispensed_at', type: 'timestamp with time zone' })
  dispensedAt: Date;
}

@Entity('material_consumptions')
export class MaterialConsumption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId: string;

  @ManyToOne(() => WorkOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'material_batch_id', type: 'uuid' })
  materialBatchId: string;

  @ManyToOne(() => MaterialBatch)
  @JoinColumn({ name: 'material_batch_id' })
  materialBatch: MaterialBatch;

  @Column({ name: 'planned_quantity', type: 'decimal', precision: 12, scale: 4 })
  plannedQuantity: number;

  @Column({ name: 'actual_quantity', type: 'decimal', precision: 12, scale: 4 })
  actualQuantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  variance: number;

  @Column({ name: 'yield_impact', length: 255, nullable: true })
  yieldImpact: string;

  @CreateDateColumn({ name: 'consumed_at', type: 'timestamp with time zone' })
  consumedAt: Date;
}
