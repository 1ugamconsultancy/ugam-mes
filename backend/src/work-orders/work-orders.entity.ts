import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  sku: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 20, default: 'PCS' })
  uom: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

@Entity('work_orders')
export class WorkOrder {
  @Column({ name: 'plant_id', type: 'uuid' })
  plantId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wo_number', length: 50, unique: true })
  woNumber: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'target_quantity', type: 'integer' })
  targetQuantity: number;

  @Column({ name: 'completed_quantity', type: 'integer', default: 0 })
  completedQuantity: number;

  @Column({ name: 'scrap_quantity', type: 'integer', default: 0 })
  scrapQuantity: number;

  @Column({ name: 'planned_start', type: 'timestamp with time zone' })
  plannedStart: Date;

  @Column({ name: 'planned_end', type: 'timestamp with time zone' })
  plannedEnd: Date;

  @Column({ name: 'actual_start', type: 'timestamp with time zone', nullable: true })
  actualStart: Date;

  @Column({ name: 'actual_end', type: 'timestamp with time zone', nullable: true })
  actualEnd: Date;

  @Column({
    type: 'text',
    default: 'DRAFT',
  })
  status: 'DRAFT' | 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'REVIEWED' | 'CLOSED';

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
