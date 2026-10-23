import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PRODUCTION_MANAGER' | 'SUPERVISOR' | 'OPERATOR' | 'QUALITY_ENGINEER';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  username: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: ['SUPER_ADMIN', 'ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR', 'OPERATOR', 'QUALITY_ENGINEER'],
  })
  role: UserRole;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ name: 'plant_id', type: 'uuid', nullable: true })
  plantId: string;

  @Column({ name: 'session_version', default: 0 })
  sessionVersion: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
