import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../work-orders/work-orders.entity';

@Entity('inventory_balances')
export class InventoryBalance {
  @Column({ name: 'plant_id', type: 'uuid', nullable: true })
  plantId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'lot_number', length: 100, unique: true })
  lotNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0.0000 })
  quantity: number;

  @Column({ name: 'wip_status', length: 50, default: 'RAW' })
  wipStatus: string;

  @Column({ name: 'location_code', length: 100, nullable: true })
  locationCode: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
