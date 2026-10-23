import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkOrder } from '../work-orders/work-orders.entity';
import { User } from '../auth/user.entity';

@Entity('quality_checks')
export class QualityCheck {
 @Column({name:'evidence_verified',default:false}) evidenceVerified: boolean;
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId: string;

  @ManyToOne(() => WorkOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'inspector_id', type: 'uuid', nullable: true })
  inspectorId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inspector_id' })
  inspector: User;

  @Column({ name: 'serial_number', length: 100, nullable: true })
  serialNumber: string;

  @Column({ name: 'check_parameters', type: 'jsonb' })
  checkParameters: any;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'PASSED', 'REJECTED', 'CONDITIONAL'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'PASSED' | 'REJECTED' | 'CONDITIONAL';

  @Column({ name: 'non_conformance_reason', type: 'text', nullable: true })
  nonConformanceReason: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
