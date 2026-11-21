export interface ShadowIngestDto {
  domain: 'PHARMA' | 'AUTOMOTIVE';
  plantId?: string;
  sourceType: 'CSV_LOG' | 'OPC_STREAM' | 'LEGACY_ERP_WEBHOOK';
  logData: Array<{
    timestamp: string;
    stageOrStation: string;
    parameterName: string;
    loggedValue: number | string;
    targetValue?: number | string;
    unit?: string;
    operatorNote?: string;
  }>;
}

export interface ShadowDiscrepancy {
  stageOrStation: string;
  parameterName: string;
  legacyRecorded: string;
  shadowDetected: string;
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
  financialLossUsd: number;
  timeLostMinutes: number;
  rootCauseAnalysis: string;
  correctiveRecommendation: string;
}

export interface ShadowAnalysisResult {
  /** True while analysis is illustrative benchmark data, not derived from uploaded plant logs. */
  isSampleData: boolean;
  runId: string;
  timestamp: string;
  domain: 'PHARMA' | 'AUTOMOTIVE';
  batchOrWorkOrder: string;
  productName: string;
  totalFinancialLossDetectedUsd: number;
  totalTimeLostMinutes: number;
  yieldGainPotentialPct: number;
  discrepancies: ShadowDiscrepancy[];
  roiSummary: {
    monthlyProjectedSavingsUsd: number;
    annualProjectedSavingsUsd: number;
    paybackPeriodDays: number;
  };
}
