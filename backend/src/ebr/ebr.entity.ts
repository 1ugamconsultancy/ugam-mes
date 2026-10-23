import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { WorkOrder } from '../work-orders/work-orders.entity';

@Entity('electronic_batch_records')
export class ElectronicBatchRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid', unique: true })
  workOrderId: string;

  @OneToOne(() => WorkOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'materials_used', type: 'jsonb' })
  materialsUsed: any; // Array of { material_code: string, batch_number: string, quantity: number, uom: string }

  @Column({ type: 'jsonb' })
  operators: any; // Array of { username: string, name: string, role: string, action: string, timestamp: string }

  @Column({ name: 'equipment_used', type: 'jsonb' })
  equipmentUsed: any; // Array of { machine_code: string, name: string, runtime_minutes: number, cleaning_status: string }

  @Column({ name: 'process_parameters', type: 'jsonb' })
  processParameters: any; // Array of { parameter: string, target: string, actual: string, status: string }

  @Column({ name: 'quality_checks', type: 'jsonb' })
  qualityChecks: any; // Array of { check: string, value: string, status: string }

  @Column({ type: 'jsonb' })
  deviations: any; // Array of { title: string, severity: string, reported_at: string, status: string }

  @Column({ type: 'jsonb' })
  signatures: any; // Array of { stage: string, user: string, name: string, meaning: string, timestamp: string }

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @Column({ length: 50, default: 'IN_PROCESS' }) // 'IN_PROCESS', 'QA_REVIEW', 'QA_APPROVED', 'QA_REJECTED'
  status: string;
}

@Entity('batch_material_usages')
export class BatchMaterialUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ebr_id', type: 'uuid' })
  ebrId: string;

  @ManyToOne(() => ElectronicBatchRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ebr_id' })
  ebr: ElectronicBatchRecord;

  @Column({ name: 'material_batch_id', type: 'uuid' })
  materialBatchId: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number;

  @Column({ length: 20 })
  uom: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp: Date;
}
