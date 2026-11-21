import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ShadowIngestDto, ShadowAnalysisResult, ShadowDiscrepancy } from './shadow.dto';

@Injectable()
export class ShadowService {
  private runs: Map<string, ShadowAnalysisResult> = new Map();

  constructor() {
    // Seed initial preloaded case studies
    const pharma = this.generatePharmaAnalysis();
    const auto = this.generateAutomotiveAnalysis();
    this.runs.set(pharma.runId, pharma);
    this.runs.set(auto.runId, auto);
  }

  analyze(dto: ShadowIngestDto): ShadowAnalysisResult {
    if (dto.domain === 'PHARMA') {
      return this.generatePharmaAnalysis(dto);
    }
    return this.generateAutomotiveAnalysis(dto);
  }

  getAnalysis(domain: 'PHARMA' | 'AUTOMOTIVE' = 'PHARMA'): ShadowAnalysisResult {
    for (const run of this.runs.values()) {
      if (run.domain === domain) return run;
    }
    return domain === 'PHARMA' ? this.generatePharmaAnalysis() : this.generateAutomotiveAnalysis();
  }

  getRuns(): ShadowAnalysisResult[] {
    return Array.from(this.runs.values());
  }

  private generatePharmaAnalysis(dto?: ShadowIngestDto): ShadowAnalysisResult {
    const discrepancies: ShadowDiscrepancy[] = [
      {
        stageOrStation: 'OP-05: Phase Mixing & Agitation',
        parameterName: 'Jacket Temperature Stability',
        legacyRecorded: '23.5°C (Within 20-25°C validated range)',
        shadowDetected: '19.8°C at 14:15:22 for 28 mins due to chiller bypass valve hunting',
        severity: 'CRITICAL',
        financialLossUsd: 3850,
        timeLostMinutes: 42,
        rootCauseAnalysis: 'Thermal drop induced partial emulsion boundary layer, slowing mass transfer and requiring 42 minutes extra settling time. Resulted in 12.4 L solvent loss.',
        correctiveRecommendation: 'Auto-interlock agitator start to PID thermal stability; configure alert threshold at 21.0°C.'
      },
      {
        stageOrStation: 'OP-08: Aqueous Phase Conductivity',
        parameterName: 'Wash Efficiency & Phase Disengagement',
        legacyRecorded: '46.0 mS/cm (Logged on paper checklist: PASS)',
        shadowDetected: '52.4 mS/cm actual peak with sluggish phase separation ramp (55 mins)',
        severity: 'WARNING',
        financialLossUsd: 4200,
        timeLostMinutes: 35,
        rootCauseAnalysis: 'Incomplete brine stratification caused operator to run 2 unrecorded secondary flushes, consuming 80 L additional solvent and 120 L purified water.',
        correctiveRecommendation: 'Deploy dynamic rate-of-change conductivity interlock to automate phase cut valve at inflection point.'
      },
      {
        stageOrStation: 'OP-09: Organic Layer Decantation',
        parameterName: 'Active Intermediate Residual Yield',
        legacyRecorded: '98.5% Theoretical Recovery (Paper Batch Estimate)',
        shadowDetected: '92.1% Actual Net Recovery; 6.8 kg API retained in rag layer interface',
        severity: 'CRITICAL',
        financialLossUsd: 6300,
        timeLostMinutes: 20,
        rootCauseAnalysis: 'Operator closed bottom drain valve 12 seconds early to avoid aqueous carryover, discarding 6.8 kg pure active intermediate into waste receiver.',
        correctiveRecommendation: 'Optical interface sensor integration with automatic pneumatic shutoff calibrated to refractive index.'
      }
    ];

    const totalLoss = discrepancies.reduce((sum, d) => sum + d.financialLossUsd, 0);
    const totalTime = discrepancies.reduce((sum, d) => sum + d.timeLostMinutes, 0);

    const result: ShadowAnalysisResult = {
      isSampleData: true,
      runId: 'SHADOW-PHARMA-' + (dto ? randomUUID().slice(0, 8) : 'BENCHMARK-01'),
      timestamp: new Date().toISOString(),
      domain: 'PHARMA',
      batchOrWorkOrder: 'WO-API-2026-001',
      productName: 'High-Purity API Intermediate X',
      totalFinancialLossDetectedUsd: totalLoss,
      totalTimeLostMinutes: totalTime,
      yieldGainPotentialPct: 6.4,
      discrepancies,
      roiSummary: {
        monthlyProjectedSavingsUsd: totalLoss * 18, // 18 batches/month
        annualProjectedSavingsUsd: totalLoss * 18 * 12,
        paybackPeriodDays: 8 // At $1,500/mo base subscription
      }
    };

    this.runs.set(result.runId, result);
    return result;
  }

  private generateAutomotiveAnalysis(dto?: ShadowIngestDto): ShadowAnalysisResult {
    const discrepancies: ShadowDiscrepancy[] = [
      {
        stageOrStation: 'Station ASM-01: Recliner Sub-assembly',
        parameterName: 'Pneumatic Spindle Torque',
        legacyRecorded: '45.0 Nm (Tally Sheet Checked "OK")',
        shadowDetected: '38.2 Nm on 14 units due to shop air pressure drop from 6.2 to 4.8 bar',
        severity: 'CRITICAL',
        financialLossUsd: 2400,
        timeLostMinutes: 55,
        rootCauseAnalysis: 'Insufficient torque caused recliner teeth slippage during end-of-line testing. 14 units sent to offline teardown bay requiring 2 operators for 3.5 hours.',
        correctiveRecommendation: 'Digital transducer angle-torque controller with hard interlock preventing station release below 43.5 Nm.'
      },
      {
        stageOrStation: 'Station ASM-02: Cushion Foam & Heater Mat',
        parameterName: 'Line Micro-stoppages & Buffer Starvation',
        legacyRecorded: 'Downtime: 0 min (Manual logs only record incidents > 15 mins)',
        shadowDetected: '34 micro-stoppages (15 to 45 secs each), totaling 68 cumulative line minutes',
        severity: 'WARNING',
        financialLossUsd: 3800,
        timeLostMinutes: 68,
        rootCauseAnalysis: 'Harness routing clip bin misaligned on operator side, forcing ergonomic reach delays and conveyor starvation on downstream stations.',
        correctiveRecommendation: 'Re-rack fasteners with gravity-fed kanban bin directly adjacent to harness insertion zone.'
      },
      {
        stageOrStation: 'Station ASM-04: Final Functional & Water Ingress Gate',
        parameterName: 'Seat Backrest Latch Pull Force',
        legacyRecorded: '100% Passed visual inspection',
        shadowDetected: '18 seats exhibited latch force variance exceeding 80 N maximum specification',
        severity: 'OPPORTUNITY',
        financialLossUsd: 2720,
        timeLostMinutes: 40,
        rootCauseAnalysis: 'Bushing tolerance stack-up between supplier batch LOT-ST-044 and pivot bracket, detected by strain gauge.',
        correctiveRecommendation: 'Automate dimensional incoming inspection gate and apply selective assembly matching.'
      }
    ];

    const totalLoss = discrepancies.reduce((sum, d) => sum + d.financialLossUsd, 0);
    const totalTime = discrepancies.reduce((sum, d) => sum + d.timeLostMinutes, 0);

    const result: ShadowAnalysisResult = {
      isSampleData: true,
      runId: 'SHADOW-AUTO-' + (dto ? randomUUID().slice(0, 8) : 'BENCHMARK-01'),
      timestamp: new Date().toISOString(),
      domain: 'AUTOMOTIVE',
      batchOrWorkOrder: 'WO-SEAT-2026-088',
      productName: 'Front Driver Ergonomic Seat Assembly',
      totalFinancialLossDetectedUsd: totalLoss,
      totalTimeLostMinutes: totalTime,
      yieldGainPotentialPct: 4.8,
      discrepancies,
      roiSummary: {
        monthlyProjectedSavingsUsd: totalLoss * 22, // 22 production shifts/month
        annualProjectedSavingsUsd: totalLoss * 22 * 12,
        paybackPeriodDays: 5 // At $1,500/mo base subscription
      }
    };

    this.runs.set(result.runId, result);
    return result;
  }
}
