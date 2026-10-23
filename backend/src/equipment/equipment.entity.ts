import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Machine } from '../plants/plants.entity';

@Entity('equipment_calibrations')
export class EquipmentCalibration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'machine_id', type: 'uuid' })
  machineId: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'calibration_date', type: 'date' })
  calibrationDate: Date;

  @Column({ name: 'next_calibration_due', type: 'date' })
  nextCalibrationDue: Date;

  @Column({ name: 'calibrated_by', length: 255 })
  calibratedBy: string;

  @Column({ name: 'certificate_number', length: 100, unique: true })
  certificateNumber: string;

  @Column({ length: 50 }) // 'PASSED', 'FAILED', 'EXPIRED'
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('equipment_qualifications')
export class EquipmentQualification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'machine_id', type: 'uuid' })
  machineId: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'qualification_type', length: 50 }) // 'IQ', 'OQ', 'PQ', 'DQ'
  qualificationType: string;

  @Column({ name: 'qualification_date', type: 'date' })
  qualificationDate: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ name: 'performed_by', length: 255 })
  performedBy: string;

  @Column({ length: 50 }) // 'COMPLETED', 'DEVIATED', 'INCOMPLETE'
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('equipment_master')
export class EquipmentMaster {
  @Column({ name: 'equipment_id', primary: true, length: 50 })
  equipmentId: string;

  @Column({ name: 'equipment_name', length: 255 })
  equipmentName: string;

  @Column({ name: 'work_center', length: 100 })
  workCenter: string;

  @Column({ name: 'equipment_type', length: 100 })
  equipmentType: string;

  @Column({ length: 100 })
  manufacturer: string;

  @Column({ length: 100 })
  model: string;

  @Column({ name: 'capacity_per_shift', type: 'integer' })
  capacityPerShift: number;

  @Column({ name: 'oee_applicable', length: 10, default: 'Y' })
  oeeApplicable: string;

  @Column({ length: 50, default: 'RUNNING' })
  status: string;
}

