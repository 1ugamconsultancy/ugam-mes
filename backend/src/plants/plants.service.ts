/**
 * @file plants.service.ts
 * @module Backend/Plants
 * @description ISA-95 physical asset hierarchy mapping and shopfloor machine master service.
 * Models multi-level manufacturing infrastructure (Enterprise -> Site / Plant -> Area -> Work Center / Line -> Machine),
 * manages live machine states (RUNNING, IDLE, BREAKDOWN, SETUP, MAINTENANCE), and tracks timestamped status transitions.
 * 
 * @compliance ANSI/ISA-95 Enterprise-Control System Integration (Part 1: Models and Terminology)
 * @compliance ISO 22400 (Manufacturing Operations Management Key Performance Indicators)
 * @compliance IATF 16949:2016 Clause 8.5.1.5 (Total Productive Maintenance)
 */

import { currentPlant } from '../auth/access-context';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant, Machine, MachineStatus } from './plants.entity';

export { Machine, MachineStatus } from './plants.entity';

/**
 * @class PlantsService
 * @description Service responsible for physical facility topology queries and live workstation state persistence.
 */
@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(Plant)
    private plantRepository: Repository<Plant>,
    @InjectRepository(Machine)
    private machineRepository: Repository<Machine>,
  ) {}

  // =========================================================================
  // SECTION 1: ISA-95 PHYSICAL PLANT HIERARCHY
  // Resolves nested plant topology across operational areas, lines, and machines.
  // =========================================================================

  /**
   * @function getHierarchy
   * @description Fetches the full ISA-95 equipment hierarchy from top-level manufacturing plants
   * down to functional areas, production lines, and physical machinery.
   * 
   * @returns {Promise<Plant[]>} Nested tree of plants with child areas, lines, and machines
   * @compliance ANSI/ISA-95 Level 3 Manufacturing Operations Management
   */
  async getHierarchy(): Promise<Plant[]> {
    return this.plantRepository.find({
      where: { id: currentPlant() },
      relations: ['areas', 'areas.lines', 'areas.lines.machines'],
    });
  }

  // =========================================================================
  // SECTION 2: MACHINE MASTER & TELEMETRY STATUS TRANSITIONS
  // Manages shopfloor equipment records, operational status, and state changes.
  // =========================================================================

  /**
   * @function getMachines
   * @description Retrieves all registered shopfloor machines and test stations across lines.
   * 
   * @returns {Promise<Machine[]>} List of registered machine entities
   */
  async getMachines(): Promise<Machine[]> {
    return this.machineRepository.find({ where: { line: { area: { plantId: currentPlant() } } } });
  }

  /**
   * @function getMachineById
   * @description Fetches a machine record by primary UUID key.
   * 
   * @param {string} id - Machine UUID
   * @returns {Promise<Machine>} Found machine entity
   * @throws {NotFoundException} If machine ID does not exist
   */
  async getMachineById(id: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({ where: { id, line: { area: { plantId: currentPlant() } } } });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    return machine;
  }

  /**
   * @function updateMachineStatus
   * @description Modifies a machine's operational state machine (RUNNING, IDLE, BREAKDOWN, SETUP, MAINTENANCE)
   * and records the exact timestamp of status transition for OEE uptime and downtime tracking.
   * 
   * @param {string} id - Target machine UUID
   * @param {MachineStatus} status - Target operational state
   * @returns {Promise<Machine>} Updated machine entity with updated lastStatusChange timestamp
   * @compliance ISO 22400 (KPIs for OEE Availability and Equipment Downtime)
   */
  async updateMachineStatus(id: string, status: MachineStatus): Promise<Machine> {
    if (!['RUNNING','IDLE','BREAKDOWN','SETUP','MAINTENANCE'].includes(status)) throw new BadRequestException('Invalid machine status');
    const machine = await this.getMachineById(id);
    machine.status = status;
    machine.lastStatusChange = new Date();
    return this.machineRepository.save(machine);
  }

  /**
   * @function createMachine
   * @description Provisions a new physical machine or workstation bound to a production line.
   * 
   * @param {Partial<Machine>} dto - Machine parameters (name, code, lineId, status)
   * @returns {Promise<Machine>} Persisted machine entity
   */
  async createMachine(dto: Partial<Machine>): Promise<Machine> {
    const lines = await this.machineRepository.query('SELECT l.id FROM lines l JOIN areas a ON a.id=l.area_id WHERE l.id=$1 AND a.plant_id=$2', [dto.lineId, currentPlant()]);
    if (!lines.length) throw new NotFoundException('Line not found');
    const machine = this.machineRepository.create({
      name: dto.name,
      code: dto.code,
      lineId: dto.lineId,
      status: dto.status || 'IDLE',
      lastStatusChange: new Date()
    });
    return this.machineRepository.save(machine);
  }
}

