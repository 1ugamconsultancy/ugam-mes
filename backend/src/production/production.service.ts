import { WorkflowService } from '../work-orders/workflow.service';
import { currentPlant } from '../auth/access-context';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { OeeService } from './oee.service';
import { ProductionGateway } from './production.gateway';

@Injectable()
export class ProductionService {
  constructor(
    private workflow: WorkflowService,
    private readonly oeeService: OeeService,
    private readonly dataSource: DataSource,
    private readonly gateway: ProductionGateway,
  ) {}

  private async assertMachine(machineId: string) {
    const rows = await this.dataSource.query(`SELECT m.id FROM machines m JOIN lines l ON l.id=m.line_id JOIN areas a ON a.id=l.area_id WHERE m.id=$1 AND a.plant_id=$2`, [machineId, currentPlant()]);
    if (!rows.length) throw new NotFoundException('Machine not found');
  }
  async getMachineMetrics(machineId: string) {
    await this.assertMachine(machineId);
    return this.oeeService.calculateOee(machineId);
  }

  async logProduction(machineId: string, good: number, scrap: number, workOrderId: string) {
    await this.assertMachine(machineId);
    await this.workflow.counts(workOrderId,good,scrap,machineId);
    const oeeMetrics = await this.oeeService.calculateOee(machineId);
    
    // Broadcast real-time stats to all dashboard sockets
    this.gateway.broadcastLiveCounter(currentPlant(), machineId, oeeMetrics.goodCount, oeeMetrics.scrapCount, oeeMetrics.oee);

    // If scrap is higher than acceptable yield, push real-time alerts
    if (scrap >= 5) {
      this.gateway.broadcastAlert(
        currentPlant(),
        'High Scrap Rate Alert',
        `Machine with ID ${machineId} logged ${scrap} scrap units in the last logging cycle. Yield threshold exceeded.`,
        'WARNING',
      );
    }

    return oeeMetrics;
  }

  async getMachinePrediction(machineId: string, machineCode: string) {
    await this.assertMachine(machineId);
    return this.oeeService.getPredictiveAnalytics(machineId, machineCode);
  }
}
