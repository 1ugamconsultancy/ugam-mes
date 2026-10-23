import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionLog } from './production-log.entity';
import { provenance } from '../common/provenance';
import { appMode } from '../auth/security-config';
@Injectable()
export class OeeService {
    constructor(
    @InjectRepository(ProductionLog)
    private logs: Repository<ProductionLog>) { }
    async calculateOee(machineId: string): Promise<any> {
        const logs = await this.logs.find({ where: { machineId, evidenceVerified: true }, order: { timestamp: 'ASC' } });
        const good = logs.length ? logs.reduce((n, l) => n + l.countGood, 0) : null;
        const scrap = logs.length ? logs.reduce((n, l) => n + l.countScrap, 0) : null;
        const total = good + scrap;
        const observed = logs.at(-1)?.timestamp;
        const missing = ['Recorded runtime, scheduled period and ideal cycle rate are required for OEE'];
        return { availability: null, performance: null, oee: null, quality: logs.length && total > 0 ? 100 * good / total : null, goodCount: good, scrapCount: scrap,
            provenance: provenance('DERIVED', observed, missing, logs.map(l => l.id)),
            countProvenance: provenance('RECORDED', observed, logs.length ? [] : ['No verified production samples'], logs.map(l => l.id)) };
    }
    async incrementCounts(): Promise<any> { throw new BadRequestException('Use order-linked production recording'); }
    async getPredictiveAnalytics(machineId: string, machineCode: string): Promise<any> {
        const demo = appMode === 'demo';
        return { machineId, machineCode, predictedDowntimeRisk: demo ? 'MEDIUM' : null, timeUntilFailureHours: demo ? 18.2 : null, oeeForecastNextShift: demo ? 76.5 : null,
            recommendations: demo ? ['Illustrative demonstration; not an equipment prediction'] : [],
            provenance: provenance(demo ? 'SIMULATED' : 'DERIVED', demo ? new Date() : null, demo ? [] : ['No validated predictive model or recorded model inputs']) };
    }
}
