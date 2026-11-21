import { useEffect, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getApiUrl } from '../config';

interface Discrepancy {
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
interface Analysis {
  isSampleData: boolean;
  batchOrWorkOrder: string;
  productName: string;
  totalFinancialLossDetectedUsd: number;
  totalTimeLostMinutes: number;
  yieldGainPotentialPct: number;
  discrepancies: Discrepancy[];
  roiSummary: { monthlyProjectedSavingsUsd: number; annualProjectedSavingsUsd: number; paybackPeriodDays: number };
}

const sevCls = { CRITICAL: 'bg-red-500/15 text-red-500', WARNING: 'bg-amber-500/15 text-amber-600', OPPORTUNITY: 'bg-sky-500/15 text-sky-600' };
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function ShadowInsightPortal() {
  const { token, user } = useShopfloorStore();
  const [domain, setDomain] = useState<'PHARMA' | 'AUTOMOTIVE'>(
    user?.plantName?.toLowerCase().includes('pharma') ? 'PHARMA' : 'AUTOMOTIVE',
  );
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(getApiUrl(`/shadow/analysis?domain=${domain}`), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [domain, token]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Eye /> Shadow Insight</h1>
          <p className="text-sm text-slate-500 mt-1">Compare what legacy records show against what sensor-level monitoring would reveal.</p>
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          {(['PHARMA', 'AUTOMOTIVE'] as const).map((d) => (
            <button key={d} onClick={() => setDomain(d)} className={`px-4 py-2 text-sm font-bold ${domain === d ? 'bg-[#174A7C] text-white' : ''}`}>
              {d === 'PHARMA' ? 'Pharma' : 'Automotive'}
            </button>
          ))}
        </div>
      </div>

      {data?.isSampleData && (
        <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
          <b>Illustrative sample data.</b> These figures are a benchmark scenario for demonstration, not measurements from your plant. Upload-based analysis is not yet implemented.
        </div>
      )}
      {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>}
      {loading && <Loader2 className="animate-spin" />}

      {data && !loading && (
        <>
          <div className="text-sm text-slate-500">{data.productName} · {data.batchOrWorkOrder}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Loss identified (per run)" value={usd(data.totalFinancialLossDetectedUsd)} />
            <Card label="Time lost" value={`${data.totalTimeLostMinutes} min`} />
            <Card label="Yield upside" value={`${data.yieldGainPotentialPct}%`} />
            <Card label="Projected annual" value={usd(data.roiSummary.annualProjectedSavingsUsd)} />
          </div>

          <div className="space-y-3">
            {data.discrepancies.map((d, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${sevCls[d.severity]}`}>{d.severity}</span>
                  <span className="font-bold">{d.stageOrStation}</span>
                  <span className="text-slate-500 text-sm">· {d.parameterName}</span>
                  <span className="ml-auto font-bold">{usd(d.financialLossUsd)}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded bg-slate-50 dark:bg-slate-900 p-2"><div className="text-xs uppercase text-slate-500">Legacy record</div>{d.legacyRecorded}</div>
                  <div className="rounded bg-slate-50 dark:bg-slate-900 p-2"><div className="text-xs uppercase text-slate-500">Shadow detected</div>{d.shadowDetected}</div>
                </div>
                <div className="text-sm"><b>Root cause:</b> {d.rootCauseAnalysis}</div>
                <div className="text-sm"><b>Recommendation:</b> {d.correctiveRecommendation}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}
