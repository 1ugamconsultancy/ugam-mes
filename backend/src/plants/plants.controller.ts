/**
 * @file plants.controller.ts
 * @module Backend/Plants
 * @description REST API Controller exposing ISA-95 plant topology, machine directory,
 * live machine state transitions, and workstation provisioning endpoints.
 * 
 * @compliance ANSI/ISA-95 Enterprise-Control System Integration
 * @compliance ISO 22400 (KPIs for OEE Availability and Equipment Downtime)
 * @compliance IATF 16949:2016 Clause 8.5.1.5 (Total Productive Maintenance)
 */

import { Controller, Get, Post, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { PlantsService, Machine, MachineStatus } from './plants.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * @class PlantsController
 * @description Controller responsible for exposing plant hierarchy and machine telemetry endpoints.
 */
@Controller('plants')
@UseGuards(AuthGuard)
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  // =========================================================================
  // SECTION 1: PHYSICAL TOPOLOGY & MACHINE MASTER
  // =========================================================================

  /**
   * @function getHierarchy
   * @description Retrieves the full ISA-95 plant hierarchy from plant sites down to areas, lines, and machines.
   * 
   * @returns {Promise<Machine[]>} Nested plant topology tree
   */
  @Get('hierarchy')
  async getHierarchy(): Promise<Machine[]> {
    return this.plantsService.getHierarchy() as any;
  }

  /**
   * @function getMachines
   * @description Fetches all registered shopfloor machines across all plant areas.
   * 
   * @returns {Promise<Machine[]>} List of registered machines
   */
  @Get('machines')
  async getMachines(): Promise<Machine[]> {
    return this.plantsService.getMachines();
  }

  /**
   * @function getMachine
   * @description Fetches a single machine record by primary UUID.
   * 
   * @param {string} id - Machine UUID
   * @returns {Promise<Machine>} Found machine entity
   */
  @Get('machines/:id')
  async getMachine(@Param('id') id: string): Promise<Machine> {
    return this.plantsService.getMachineById(id);
  }

  // =========================================================================
  // SECTION 2: MACHINE TELEMETRY & STATUS MANAGEMENT
  // =========================================================================

  /**
   * @function updateMachineStatus
   * @description Modifies a machine's operational state (RUNNING, IDLE, BREAKDOWN, SETUP, MAINTENANCE).
   * Restricted to Supervisors, Operators, and System Administrators.
   * 
   * @param {string} id - Target machine UUID
   * @param {MachineStatus} status - New machine operational status
   * @returns {Promise<Machine>} Updated machine entity
   * @compliance ISO 22400 Machine State Auditing
   */
  @Roles('SUPERVISOR', 'OPERATOR', 'ADMIN')
  @Patch('machines/:id/status')
  async updateMachineStatus(
    @Param('id') id: string,
    @Body('status') status: MachineStatus,
  ): Promise<Machine> {
    return this.plantsService.updateMachineStatus(id, status);
  }

  /**
   * @function createMachine
   * @description Provisions a new machine or assembly station bound to a production line.
   * Restricted to Production Managers, Supervisors, and System Administrators.
   * 
   * @param {any} dto - Machine properties (name, code, lineId, status)
   * @returns {Promise<Machine>} Persisted machine entity
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'ADMIN')
  @Post('machines')
  async createMachine(@Body() dto: any): Promise<Machine> {
    return this.plantsService.createMachine(dto);
  }
}

