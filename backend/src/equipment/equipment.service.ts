import { provenance } from '../common/provenance';
import { currentPlant } from '../auth/access-context';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentCalibration, EquipmentQualification, EquipmentMaster } from './equipment.entity';
import { Machine, Line } from '../plants/plants.entity';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(EquipmentCalibration)
    private calibrationRepo: Repository<EquipmentCalibration>,
    @InjectRepository(EquipmentQualification)
    private qualificationRepo: Repository<EquipmentQualification>,
    @InjectRepository(EquipmentMaster)
    private equipmentMasterRepo: Repository<EquipmentMaster>,
    @InjectRepository(Machine)
    private machineRepo: Repository<Machine>,
  ) {}

  async getMasterEquipment(): Promise<EquipmentMaster[]> {
    return this.equipmentMasterRepo.query(`SELECT em.* FROM equipment_master em JOIN machines m ON m.code=em.equipment_id JOIN lines l ON l.id=m.line_id JOIN areas a ON a.id=l.area_id WHERE a.plant_id=$1 ORDER BY em.equipment_id`, [currentPlant()]).then(rows => rows.map(row => this.equipmentMasterRepo.create({ equipmentId: row.equipment_id, equipmentName: row.equipment_name, workCenter: row.work_center, equipmentType: row.equipment_type, manufacturer: row.manufacturer, model: row.model, capacityPerShift: row.capacity_per_shift, oeeApplicable: row.oee_applicable, status: row.status }))); 
  }

  async createMasterEquipment(dto: Partial<EquipmentMaster> & { lineId?: string }): Promise<EquipmentMaster> {
    if (!dto.lineId) throw new NotFoundException('Select a production line');
    const lines = await this.machineRepo.query('SELECT l.id FROM lines l JOIN areas a ON a.id=l.area_id WHERE l.id=$1 AND a.plant_id=$2', [dto.lineId, currentPlant()]);
    if (!lines.length) throw new NotFoundException('Line not found');
    const eq = this.equipmentMasterRepo.create({
      equipmentId: dto.equipmentId?.toUpperCase().trim(),
      equipmentName: dto.equipmentName?.trim(),
      workCenter: dto.workCenter?.toUpperCase().trim() || 'WC-GEN',
      equipmentType: dto.equipmentType?.toUpperCase().trim() || 'EQUIPMENT',
      manufacturer: dto.manufacturer?.trim() || 'OEM',
      model: dto.model?.trim() || 'STD',
      capacityPerShift: Number(dto.capacityPerShift) || 500,
      oeeApplicable: dto.oeeApplicable?.toUpperCase() === 'N' ? 'N' : 'Y',
      status: dto.status || 'RUNNING',
    });
    const saved = await this.equipmentMasterRepo.save(eq);

    // Sync to machines table if not present
    try {
      const existingMachine = await this.machineRepo.findOne({ where: { code: saved.equipmentId } });
      if (!existingMachine) {
        let lineId = dto.lineId;
        if (!lineId) {
          const lines = await this.machineRepo.query(`SELECT id FROM lines LIMIT 1`);
          if (lines && lines.length > 0) lineId = lines[0].id;
        }
        await this.machineRepo.save(
          this.machineRepo.create({
            code: saved.equipmentId,
            name: saved.equipmentName,
            status: (saved.status as any) || 'RUNNING',
            lineId: lineId,
          })
        );
      }
    } catch (e) {
      console.warn('Sync to machines table failed (non-critical):', e);
    }

    return saved;
  }

  async updateMasterEquipment(id: string, dto: Partial<EquipmentMaster>): Promise<EquipmentMaster> {
    const owner = await this.machineRepo.findOne({ where: { code: id.toUpperCase().trim(), line: { area: { plantId: currentPlant() } } } });
    if (!owner) throw new NotFoundException('Equipment not found');
    const eq = await this.equipmentMasterRepo.findOne({ where: { equipmentId: id.toUpperCase().trim() } });
    if (!eq) throw new NotFoundException(`Equipment asset ${id} not found`);

    if (dto.equipmentName !== undefined) eq.equipmentName = dto.equipmentName;
    if (dto.workCenter !== undefined) eq.workCenter = dto.workCenter.toUpperCase().trim();
    if (dto.equipmentType !== undefined) eq.equipmentType = dto.equipmentType.toUpperCase().trim();
    if (dto.manufacturer !== undefined) eq.manufacturer = dto.manufacturer;
    if (dto.model !== undefined) eq.model = dto.model;
    if (dto.capacityPerShift !== undefined) eq.capacityPerShift = Number(dto.capacityPerShift);
    if (dto.oeeApplicable !== undefined) eq.oeeApplicable = dto.oeeApplicable.toUpperCase();
    if (dto.status !== undefined) eq.status = dto.status;

    const saved = await this.equipmentMasterRepo.save(eq);

    // Sync status & name to machines table
    try {
      const m = await this.machineRepo.findOne({ where: { code: eq.equipmentId } });
      if (m) {
        if (dto.equipmentName) m.name = dto.equipmentName;
        if (dto.status) m.status = dto.status as any;
        await this.machineRepo.save(m);
      }
    } catch (e) {
      console.warn('Sync to machine status failed:', e);
    }

    return saved;
  }

  async deleteMasterEquipment(id: string): Promise<{ success: boolean }> {
    const owner = await this.machineRepo.findOne({ where: { code: id.toUpperCase().trim(), line: { area: { plantId: currentPlant() } } } });
    if (!owner) throw new NotFoundException('Equipment not found');
    const eq = await this.equipmentMasterRepo.findOne({ where: { equipmentId: id.toUpperCase().trim() } });
    if (!eq) throw new NotFoundException(`Equipment asset ${id} not found`);
    await this.equipmentMasterRepo.remove(eq);
    return { success: true };
  }

  async getCalibrations(): Promise<EquipmentCalibration[]> {
    return this.calibrationRepo.find({ where: { machine: { line: { area: { plantId: currentPlant() } } } }, relations: ['machine'] });
  }

  async addCalibration(dto: Partial<EquipmentCalibration>): Promise<EquipmentCalibration> {
    const machine = await this.machineRepo.findOne({ where: { id: dto.machineId, line: { area: { plantId: currentPlant() } } } });
    if (!machine) throw new NotFoundException('Machine not found');
    const cal = this.calibrationRepo.create({
      machineId: dto.machineId,
      calibrationDate: new Date(dto.calibrationDate),
      nextCalibrationDue: new Date(dto.nextCalibrationDue),
      calibratedBy: dto.calibratedBy,
      certificateNumber: dto.certificateNumber,
      status: dto.status || 'PASSED',
    });
    return this.calibrationRepo.save(cal);
  }

  async getQualifications(): Promise<EquipmentQualification[]> {
    return this.qualificationRepo.find({ where: { machine: { line: { area: { plantId: currentPlant() } } } }, relations: ['machine'] });
  }

  async addQualification(dto: Partial<EquipmentQualification>): Promise<EquipmentQualification> {
    const machine = await this.machineRepo.findOne({ where: { id: dto.machineId, line: { area: { plantId: currentPlant() } } } });
    if (!machine) throw new NotFoundException('Machine not found');
    const qual = this.qualificationRepo.create({
      machineId: dto.machineId,
      qualificationType: dto.qualificationType,
      qualificationDate: new Date(dto.qualificationDate),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      performedBy: dto.performedBy,
      status: dto.status || 'COMPLETED',
      notes: dto.notes,
    });
    return this.qualificationRepo.save(qual);
  }

  // Get aggregated statuses of all machines (Qualified, Calibration Due, Cleaning Due, Under Maintenance)
  async getEquipmentStatuses(): Promise<any[]> {
    const plant = currentPlant();
    const machines = await this.machineRepo.find({ where: { line: { area: { plantId: plant } } }, relations: ['line', 'line.area'], order: { code: 'ASC' } });
    const masterRecords = await this.getMasterEquipment();
    const calibrations = await this.getCalibrations();
    const qualifications = await this.getQualifications();
    let counts: any[] = [], countError = '';
    try {
      counts = await this.machineRepo.query(`SELECT p.machine_id, SUM(p.count_good) AS good, SUM(p.count_scrap) AS scrap,
        MIN(p.timestamp) AS first_observation, MAX(p.timestamp) AS last_observation
        FROM production_logs p JOIN machines m ON m.id=p.machine_id JOIN lines l ON l.id=m.line_id
        JOIN areas a ON a.id=l.area_id JOIN work_orders w ON w.id=p.work_order_id
        WHERE a.plant_id=$1 AND w.plant_id=$1 AND p.evidence_verified=true GROUP BY p.machine_id`, [plant]);
    } catch { countError = 'Recorded production totals could not be loaded'; }
    return machines.map(m => {
      const master = masterRecords.find(x => x.equipmentId === m.code);
      const cals = calibrations.filter(c => c.machineId === m.id).sort((a,b) => +new Date(b.calibrationDate)-+new Date(a.calibrationDate));
      const cal = cals[0];
      const pq = qualifications.filter(q => q.machineId === m.id && q.qualificationType === 'PQ').sort((a,b) => +new Date(b.qualificationDate)-+new Date(a.qualificationDate))[0];
      const now = Date.now();
      const due = cal?.nextCalibrationDue ? +new Date(cal.nextCalibrationDue) : null;
      const calibrationStatus = !cal ? 'Unavailable' : cal.status !== 'PASSED' ? cal.status : due === null ? 'Unavailable' : due <= now ? 'Expired' : due-now <= 15*86400000 ? 'Due' : 'Calibrated';
      const qualificationType = !pq ? 'Unavailable' : pq.status !== 'COMPLETED' ? pq.status : pq.expiryDate && +new Date(pq.expiryDate)<=now ? 'Expired' : 'PQ Certified';
      const count = counts.find(c => c.machine_id === m.id);
      const missing = countError ? [countError] : count ? [] : ['No verified production samples'];
      const complianceStatus = ['MAINTENANCE','BREAKDOWN'].includes(m.status) ? 'Under Maintenance' :
        ['Expired','Due'].includes(calibrationStatus) ? 'Calibration Due' :
        calibrationStatus === 'Calibrated' && qualificationType === 'PQ Certified' ? 'Qualified' : 'Evidence incomplete';
      return {
        id:m.id,equipmentId:m.code,name:master?.equipmentName ?? m.name,description:master?.equipmentName ?? m.name,code:m.code,
        workCenter:master?.workCenter ?? null,equipmentType:master?.equipmentType ?? null,
        manufacturer:master?.manufacturer ?? null,model:master?.model ?? null,capacityPerShift:master?.capacityPerShift ?? null,
        oeeApplicable:master?.oeeApplicable ?? null,lineName:m.line?.name ?? null,areaName:m.line?.area?.name ?? null,
        status:m.status,produced:count ? Number(count.good) : null,scrap:count ? Number(count.scrap) : null,
        statusProvenance:provenance('RECORDED', m.lastStatusChange, m.status ? [] : ['No recorded machine status'], [m.id]),
        countProvenance:provenance('DERIVED',count?.last_observation,missing,[{table:'production_logs',machineId:m.id,plantId:plant,evidenceVerified:true}],
          count ? {start:count.first_observation,end:count.last_observation,label:'Recorded lifetime totals; not shift totals'} : null),
        calibrationStatus,complianceStatus,nextCalibrationDue:cal?.nextCalibrationDue ?? null,qualificationType,
      };
    });
  }
}
