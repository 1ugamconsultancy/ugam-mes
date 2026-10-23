import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/user.entity';
import { WorkOrder } from '../work-orders/work-orders.entity';

@Entity('electronic_signatures')
export class ElectronicSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100 })
  username: string;

  @Column({ length: 255 })
  meaning: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamp with time zone' })
  timestamp: Date;
}

@Entity('audit_trail')
export class AuditTrail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100, nullable: true })
  username: string;

  @Column({ length: 255 })
  action: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp: Date;
}

@Entity('deviations')
export class Deviation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId: string;

  @ManyToOne(() => WorkOrder, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 50 }) // MINOR, MAJOR, CRITICAL
  severity: string;

  @Column({ length: 100 }) // MATERIAL, EQUIPMENT, PROCESS, DOCUMENTATION, OTHER
  category: string;

  @Column({ name: 'reported_by', type: 'uuid' })
  reportedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_by' })
  reporter: User;

  @CreateDateColumn({ name: 'reported_at', type: 'timestamp with time zone' })
  reportedAt: Date;

  @Column({ length: 50, default: 'OPEN' }) // OPEN, INVESTIGATING, CLOSED
  status: string;

  @Column({ name: 'investigation_details', type: 'text', nullable: true })
  investigationDetails: string;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause: string;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;
}

@Entity('capas')
export class Capa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deviation_id', type: 'uuid', nullable: true })
  deviationId: string;

  @ManyToOne(() => Deviation, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deviation_id' })
  deviation: Deviation;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'action_type', length: 50 }) // CORRECTIVE, PREVENTIVE
  actionType: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date;

  @Column({ length: 50, default: 'OPEN' }) // OPEN, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
  status: string;

  @Column({ name: 'verification_details', type: 'text', nullable: true })
  verificationDetails: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('change_controls')
export class ChangeControl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'reason_for_change', type: 'text' })
  reasonForChange: string;

  @Column({ name: 'impact_assessment', type: 'text', nullable: true })
  impactAssessment: string;

  @Column({ length: 50, default: 'DRAFT' }) // DRAFT, UNDER_REVIEW, APPROVED, IMPLEMENTED, CLOSED, REJECTED
  status: string;

  @Column({ name: 'initiated_by', type: 'uuid' })
  initiatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiated_by' })
  initiator: User;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}

@Entity('document_management')
export class DocumentManagement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_number', length: 100, unique: true })
  documentNumber: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 20 })
  version: string;

  @Column({ name: 'document_type', length: 50 }) // SOP, PROTOCOL, RECIPE, REPORT, SPECIFICATION
  documentType: string;

  @Column({ name: 'file_path', length: 255, nullable: true })
  filePath: string;

  @Column({ length: 50, default: 'DRAFT' }) // DRAFT, UNDER_REVIEW, EFFECTIVE, SUPERSEDED, OBSOLETE
  status: string;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
