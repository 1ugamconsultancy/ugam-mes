import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrder, Product } from './work-orders.entity';
import { WorkflowService } from './workflow.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, Product])],
  providers: [WorkOrdersService, WorkflowService],
  controllers: [WorkOrdersController],
  exports: [WorkflowService, WorkOrdersService, TypeOrmModule],
})
export class WorkOrdersModule {}

