import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface ThemeColors {
  bgPrimary: string;
  bgSection: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  colorPrimary: string;
  colorCorporate: string;
  colorAccent: string;
  colorRunning?: string;
  colorIdle?: string;
  colorBreakdown?: string;
}

@Entity('plant_theme_settings')
export class PlantThemeSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ name: 'plant_id', type: 'uuid', unique: true, nullable: true })
  plantId: string;

  @Column({ name: 'theme_name', length: 100, default: 'Ugam Corporate Navy' })
  themeName: string;

  @Column({ name: 'palette_type', length: 50, default: 'PRESET' })
  paletteType: string;

  @Column({ name: 'is_dark_mode', default: false })
  isDarkMode: boolean;

  @Column({ type: 'jsonb' })
  colors: ThemeColors;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
