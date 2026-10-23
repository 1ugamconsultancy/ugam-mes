import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('production_logs')
export class ProductionLog {
 @Column({name:'evidence_verified',default:false}) evidenceVerified: boolean;
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId: string;

  @Column({ name: 'machine_id', type: 'uuid' })
  machineId: string;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId: string;

  @Column({ name: 'shift_id', type: 'uuid', nullable: true })
  shiftId: string;

  @Column({ name: 'count_good', type: 'integer', default: 0 })
  countGood: number;

  @Column({ name: 'count_scrap', type: 'integer', default: 0 })
  countScrap: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp: Date;
}
