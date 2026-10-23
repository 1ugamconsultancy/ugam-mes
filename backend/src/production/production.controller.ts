import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductionService } from './production.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('production')
@UseGuards(AuthGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('metrics/:machineId')
  async getMetrics(@Param('machineId') machineId: string) {
    return this.productionService.getMachineMetrics(machineId);
  }

  @Roles('OPERATOR', 'SUPERVISOR', 'PRODUCTION_MANAGER', 'ADMIN')
  @Post('log')
  async logProduction(
    @Body('machineId') machineId: string,
    @Body('good') good: number,
    @Body('scrap') scrap: number,
    @Body('workOrderId') workOrderId: string,
  ) {
    return this.productionService.logProduction(machineId, good, scrap, workOrderId);
  }

  @Get('prediction/:machineId')
  async getMachinePrediction(
    @Param('machineId') machineId: string,
    @Query('code') code: string,
  ) {
    return this.productionService.getMachinePrediction(machineId, code || 'PNP-01');
  }
}
