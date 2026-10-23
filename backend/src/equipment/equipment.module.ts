import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentCalibration, EquipmentQualification, EquipmentMaster } from './equipment.entity';
import { Machine } from '../plants/plants.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentCalibration,
      EquipmentQualification,
      EquipmentMaster,
      Machine
    ]),
  ],
  providers: [EquipmentService],
  controllers: [EquipmentController],
  exports: [EquipmentService, TypeOrmModule],
})
export class EquipmentModule {}
