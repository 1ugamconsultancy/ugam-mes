import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Machine } from '../plants/plants.entity';

@Entity('downtime_events')
export class DowntimeEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'machine_id', type: 'uuid' })
  machineId: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'reason_code', length: 100 })
  reasonCode: string;

  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp with time zone', nullable: true })
  endedAt: Date;

  @Column({ name: 'is_planned', type: 'boolean', default: false })
  isPlanned: boolean;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ name: 'reported_by', type: 'uuid', nullable: true })
  reportedBy: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;
}
