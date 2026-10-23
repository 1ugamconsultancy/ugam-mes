import { provenance } from '../common/provenance';
import { appMode } from '../auth/security-config';
import { currentPlant } from '../auth/access-context';
import { Controller, Get, Post, Body, UseGuards, Req, Param, Query, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { QualityCheck } from './quality-check.entity';
import { WorkOrder } from '../work-orders/work-orders.entity';
import { User } from '../auth/user.entity';

@Controller('quality')
@UseGuards(AuthGuard)
export class QualityController {
  constructor(
    @InjectRepository(QualityCheck)
    private qualityRepository: Repository<QualityCheck>,
    @InjectRepository(WorkOrder)
    private workOrderRepository: Repository<WorkOrder>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private mapCheck(qc: QualityCheck) {
    if (!qc) return null;
    const name = qc.inspector ? `${qc.inspector.firstName || ''} ${qc.inspector.lastName || ''}`.trim() : 'Operator Terminal';
    return {
      id: qc.id,
      woNumber: qc.workOrder?.woNumber || null,
      serialNumber: qc.serialNumber || null,
      inspectorName: name || 'Operator Terminal',
      status: qc.status,
      defectCode: qc.status === 'REJECTED' ? (qc.checkParameters?.defectCode || null) : undefined,
      defectDescription: qc.nonConformanceReason || undefined,
      checkParameters: qc.evidenceVerified?qc.checkParameters:null,
      evidenceStatus:qc.evidenceVerified?'RECORDED':'LEGACY_UNVERIFIED',
      timestamp: qc.createdAt,
    };
  }

  @Get('checks')
  async getChecks() {
    const checks = await this.qualityRepository.find({
      where: { workOrder: { plantId: currentPlant() } },
      relations: ['workOrder', 'inspector'],
      order: { createdAt: 'DESC' },
    });
    return checks.map(qc => this.mapCheck(qc));
  }

  @Roles('QUALITY_ENGINEER', 'OPERATOR', 'ADMIN')
  @Post('inspect')
  async createCheck(@Body() dto: any, @Req() req: any) {
    // Find work order by number or ID
    const isId=/^[0-9a-f-]{36}$/i.test(dto.woNumber||'');
    const wo = await this.workOrderRepository.findOne({where:isId?{id:dto.woNumber,plantId:currentPlant()}:{woNumber:dto.woNumber,plantId:currentPlant()}});

    if (!wo) {
      throw new BadRequestException(`Batch record with ID/Number ${dto.woNumber} not found`);
    }

    const inspectorId = req.user?.sub;
    const inspector = inspectorId ? await this.userRepository.findOneBy({ id: inspectorId }) : null;

    if (!dto.serialNumber || !dto.checkParameters || !Object.keys(dto.checkParameters).length || !['PASSED','REJECTED'].includes(dto.status)) throw new BadRequestException('Serial number, recorded measurements and explicit result required');
    if(!Array.isArray(dto.checkParameters.measurements) || !dto.checkParameters.measurements.length || dto.checkParameters.measurements.some((x:any)=>!x.parameter || !x.unit || typeof x.value!=='number' || !Number.isFinite(x.value))) throw new BadRequestException('Each measurement requires a parameter, unit and finite recorded value');
    if(dto.status==='REJECTED' && !dto.nonConformanceReason && !dto.defectDescription) throw new BadRequestException('Rejection reason required');
    const newCheck = this.qualityRepository.create({
      workOrderId: wo.id,
      inspectorId: inspector?.id || null,
      serialNumber: dto.serialNumber,
      evidenceVerified: appMode!=='demo',
      status: dto.status || 'PASSED',
      checkParameters: dto.checkParameters,
      nonConformanceReason: dto.defectDescription || dto.nonConformanceReason || null,
    });

    const saved = await this.qualityRepository.save(newCheck);
    
    // Reload with relations
    const reloaded = await this.qualityRepository.findOne({
      where: { id: saved.id },
      relations: ['workOrder', 'inspector'],
    });

    return this.mapCheck(reloaded);
  }

  @Get('pareto')
  async getParetoAnalysis() {
   const rows=await this.qualityRepository.find({where:{workOrder:{plantId:currentPlant()},evidenceVerified:true,status:'REJECTED'},relations:['workOrder']});
   const counts=new Map<string,number>();rows.forEach(q=>{const key=q.nonConformanceReason||'Recorded rejection (reason missing)';counts.set(key,(counts.get(key)||0)+1);});
   return [...counts].map(([defect,count])=>({defect,count,percentage:100*count/rows.length}));
  }
  @Get('spc')
  async getSpcChartData(@Query('workOrderId') workOrderId?:string,@Query('parameter') parameter?:string,@Query('unit') unit?:string) {
   if(!workOrderId||!parameter||!unit) return {points:[],ucl:null,lcl:null,specificationLimits:null,provenance:provenance('DERIVED',null,['Select an order, recorded parameter and unit'])};
   const rows=await this.qualityRepository.find({where:{workOrderId,workOrder:{plantId:currentPlant()},evidenceVerified:true},relations:['workOrder'],order:{createdAt:'ASC'}});
   const points=rows.flatMap(r=>(r.checkParameters?.measurements||[]).filter((x:any)=>x.parameter===parameter&&x.unit===unit&&typeof x.value==='number'&&Number.isFinite(x.value)).map((x:any)=>({val:x.value,date:r.createdAt,sourceId:r.id}))).map((x:any,i:number)=>({...x,sample:i+1}));
   return {parameterName:parameter,unit,ucl:null,lcl:null,target:null,specificationLimits:null,points,
    statisticsStatus:'UNAVAILABLE',missingStatistics:['No validated control-limit configuration is recorded'],
    provenance:provenance('RECORDED',points[points.length-1]?.date,points.length?[]:['No matching recorded samples'],points.map(p=>p.sourceId),{workOrderId})};
  }

  // Pharma specific IPQC tests summary
  @Get('ipqc')
  async getIpqcSummary() {
    const checks = await this.qualityRepository.find({
      where: { workOrder: { plantId: currentPlant() } },
      relations: ['workOrder'],
      order: { createdAt: 'DESC' },
      take: 20
    });

    return checks.map(qc => ({
      id: qc.id,
      woNumber: qc.workOrder?.woNumber,
      serialNumber: qc.serialNumber,
      weight: qc.evidenceVerified ? (qc.checkParameters?.weight ?? null) : null,
      hardness: qc.evidenceVerified ? (qc.checkParameters?.hardness ?? null) : null,
      thickness: qc.evidenceVerified ? (qc.checkParameters?.thickness ?? null) : null,
      dissolution: qc.evidenceVerified ? (qc.checkParameters?.dissolution ?? null) : null,
      appearance: qc.evidenceVerified && typeof qc.checkParameters?.surface_defect==='boolean' ? (qc.checkParameters.surface_defect?'REJECTED':'PASSED') : null,
      status: qc.status,
      timestamp: qc.createdAt
    }));
  }
}
