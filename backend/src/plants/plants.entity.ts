import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

export type MachineStatus = 'RUNNING' | 'IDLE' | 'BREAKDOWN' | 'SETUP' | 'MAINTENANCE';

@Entity('plants')
export class Plant {
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'archived_by', type: 'uuid', nullable: true })
  archivedBy: string | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ length: 50, nullable: true, default: 'Asia/Kolkata' })
  timezone: string;

  @Column({ length: 30, nullable: true, default: 'ACTIVE' })
  status: string;

  @OneToMany(() => Area, (area) => area.plant, { cascade: true })
  areas: Area[];
}

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plant_id' })
  plantId: string;

  @ManyToOne(() => Plant, (plant) => plant.areas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plant_id' })
  plant: Plant;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @OneToMany(() => Line, (line) => line.area, { cascade: true })
  lines: Line[];
}

@Entity('lines')
export class Line {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'area_id' })
  areaId: string;

  @ManyToOne(() => Area, (area) => area.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @OneToMany(() => Machine, (machine) => machine.line, { cascade: true })
  machines: Machine[];
}

@Entity('machines')
export class Machine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'line_id' })
  lineId: string;

  @ManyToOne(() => Line, (line) => line.machines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'line_id' })
  line: Line;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: ['RUNNING', 'IDLE', 'BREAKDOWN', 'SETUP', 'MAINTENANCE'],
    default: 'IDLE',
  })
  status: MachineStatus;

  @Column({ name: 'last_status_change', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  lastStatusChange: Date;
}
