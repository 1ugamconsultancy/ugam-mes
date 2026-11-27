import { WorkflowService } from './workflow.service';
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { WorkOrdersService, WorkOrder } from './work-orders.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('work-orders')
@UseGuards(AuthGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService, private workflow: WorkflowService) {}

  @Post(':id/transitions')
  transition(@Param('id') id: string,@Body() dto: any) { return this.workflow.transition(id,dto); }
  @Roles('OPERATOR','SUPERVISOR','PRODUCTION_MANAGER','ADMIN')
  @Post(':id/evidence')
  evidence(@Param('id') id: string,@Body() dto: any) { return this.workflow.recordEvidence(id,dto); }
  @Get()
  async findAll(): Promise<WorkOrder[]> {
    return this.workOrdersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<WorkOrder> {
    return this.workOrdersService.findById(id);
  }

  /** Only roles allowed to PLAN an order may create one (it is saved as PLANNED). */
  @Roles('PRODUCTION_MANAGER', 'ADMIN')
  @Post()
  async create(@Body() body: any): Promise<WorkOrder> {
    const { woNumber, productId, recipeId, targetQuantity, plannedStart, plannedEnd, reason } = body || {};
    return this.workOrdersService.create({ woNumber, productId, recipeId, targetQuantity, plannedStart, plannedEnd, reason });
  }

  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'OPERATOR', 'ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<WorkOrder>): Promise<WorkOrder> {
    return this.workOrdersService.update(id, dto);
  }

  @Roles('OPERATOR', 'SUPERVISOR', 'PRODUCTION_MANAGER', 'ADMIN')
  @Patch(':id/increment')
  async increment(
    @Param('id') id: string,
    @Body('good') good: number,
    @Body('scrap') scrap: number,
    @Body('machineId') machineId: string,
  ): Promise<WorkOrder> {
    return this.workOrdersService.incrementProgress(id, good, scrap, machineId);
  }
}
