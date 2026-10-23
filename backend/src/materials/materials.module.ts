import { DispensingService } from './dispensing.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { User } from '../auth/user.entity';
import {
  Vendor,
  MaterialMaster,
  Warehouse,
  StorageLocation,
  GoodsReceipt,
  MaterialBatch,
  MaterialInventory,
  MaterialTransaction,
  DispensingRecord,
  MaterialConsumption
} from './materials.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vendor,
      MaterialMaster,
      Warehouse,
      StorageLocation,
      GoodsReceipt,
      MaterialBatch,
      MaterialInventory,
      MaterialTransaction,
      DispensingRecord,
      MaterialConsumption,
      User
    ]),
  ],
  providers: [DispensingService, MaterialsService],
  controllers: [MaterialsController],
  exports: [MaterialsService, TypeOrmModule],
})
export class MaterialsModule {}
