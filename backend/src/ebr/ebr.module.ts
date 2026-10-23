import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EbrService } from './ebr.service';
import { EbrController } from './ebr.controller';
import { ElectronicBatchRecord, BatchMaterialUsage } from './ebr.entity';
import { WorkOrder } from '../work-orders/work-orders.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ElectronicBatchRecord,
      BatchMaterialUsage,
      WorkOrder
    ]),
  ],
  providers: [EbrService],
  controllers: [EbrController],
  exports: [EbrService, TypeOrmModule],
})
export class EbrModule {}
