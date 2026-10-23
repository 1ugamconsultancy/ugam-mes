import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { PlantsModule } from './plants/plants.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { ProductionModule } from './production/production.module';
import { QualityModule } from './quality/quality.module';
import { DowntimeModule } from './downtime/downtime.module';
import { InventoryModule } from './inventory/inventory.module';
import { MaterialsModule } from './materials/materials.module';
import { RecipesModule } from './recipes/recipes.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ComplianceModule } from './compliance/compliance.module';
import { EbrModule } from './ebr/ebr.module';
import { DatabaseModule } from './database/database.module';
import { OpcModule } from './opc/opc.module';
import { EnterpriseModule } from './enterprise/enterprise.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'mes_admin',
      password: process.env.DB_PASSWORD || 'SecretMESPassword123',
      database: process.env.DB_DATABASE || 'ugam_mes',
      autoLoadEntities: true,
      synchronize: false, // strictly disabled for GAMP 5 compliance
    }),
    AuthModule,
    EnterpriseModule,
    PlantsModule,
    WorkOrdersModule,
    ProductionModule,
    QualityModule,
    DowntimeModule,
    InventoryModule,
    MaterialsModule,
    RecipesModule,
    EquipmentModule,
    ComplianceModule,
    EbrModule,
    DatabaseModule,
    OpcModule,
  ],
})
export class AppModule {}
