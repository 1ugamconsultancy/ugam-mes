import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Product } from '../work-orders/work-orders.entity';
import { User } from '../auth/user.entity';

@Entity('batch_recipes')
@Unique(['recipeCode', 'version'])
export class BatchRecipe {
  @Column({name:'evidence_requirements',type:'jsonb',nullable:true})
  evidenceRequirements: any;
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'recipe_code', length: 50 })
  recipeCode: string;

  @Column({ name: 'recipe_name', length: 255 })
  recipeName: string;

  @Column({ length: 20 })
  version: string;

  @Column({ name: 'master_formula', type: 'text', nullable: true })
  masterFormula: string;

  @Column({ type: 'jsonb' })
  bom: any; // Array of { material_code: string, quantity: number, uom: string, purpose: string }

  @Column({ name: 'process_instructions', type: 'jsonb' })
  processInstructions: any; // Array of { step: number, operation: string, instruction: string, critical_params: string }

  @Column({ name: 'planned_yield_pct', type: 'decimal', precision: 5, scale: 2, default: 100.00 })
  plannedYieldPct: number;

  @Column({ length: 50, default: 'ACTIVE' }) // 'ACTIVE', 'DRAFT', 'SUPERSEDED', 'RETIRED'
  status: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
