import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityController } from './quality.controller';
import { QualityCheck } from './quality-check.entity';
import { WorkOrder } from '../work-orders/work-orders.entity';
import { User } from '../auth/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QualityCheck, WorkOrder, User])],
  controllers: [QualityController],
  exports: [TypeOrmModule],
})
export class QualityModule {}
