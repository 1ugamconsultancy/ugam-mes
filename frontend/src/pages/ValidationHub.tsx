import { useState } from 'react';
import { ShieldCheck, Play, CheckCircle2, XCircle, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getApiUrl } from '../config';

interface Check {
  id: string;
  category: 'IQ' | 'OQ' | 'PQ';
  title: string;
  requirementRef: string;
  description: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  executionTimeMs: number;
  evidence: Record<string, any>;
}
interface Dossier {
  executionId: string;
  executedAt: string;
  executedBy: string;
  gampCategory: string;
  overallStatus: 'QUALIFIED' | 'NON_CONFORMING';
  manifestSha256: string;
  summary: { totalTests: number; passedTests: number; failedTests: number; iqScorePct: number; oqScorePct: number; pqScorePct: number };
  checks: Check[];
}

const statusStyle = {
  PASSED: { icon: CheckCircle2, cls: 'text-emerald-500' },
  FAILED: { icon: XCircle, cls: 'text-red-500' },
  WARNING: { icon: AlertTriangle, cls: 'text-amber-500' },
};

export default function ValidationHub() {
  const { token, user } = useShopfloorStore();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl('/compliance/validation/run'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setDossier(await res.json());
    } catch (e: any) {
      setError(e.message || 'Validation run failed');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!dossier) return;
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${dossier.executionId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck /> Validation Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Automated IQ / OQ / PQ checks against the live system. Results are hashed (SHA-256) for tamper evidence.</p>
          {user?.plantName && <span className="inline-block mt-2 text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">🏭 {user.plantName}</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={run} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#174A7C] text-white font-bold disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run Qualification
          </button>
          {dossier && (
            <button onClick={download} className="flex items-center gap-2 px-4 py-2 rounded-lg border font-bold">
              <Download size={16} /> Export JSON
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>}

      {dossier && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Overall" value={dossier.overallStatus === 'QUALIFIED' ? 'Qualified' : 'Non-conforming'} tone={dossier.overallStatus === 'QUALIFIED' ? 'ok' : 'bad'} />
            <Stat label="IQ" value={`${dossier.summary.iqScorePct}%`} />
            <Stat label="OQ" value={`${dossier.summary.oqScorePct}%`} />
            <Stat label="PQ" value={`${dossier.summary.pqScorePct}%`} />
            <Stat label="Tests" value={`${dossier.summary.passedTests}/${dossier.summary.totalTests}`} />
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <div>Execution: <b>{dossier.executionId}</b> · {new Date(dossier.executedAt).toLocaleString()} · by {dossier.executedBy}</div>
            <div>Classification: {dossier.gampCategory}</div>
            <div className="break-all">SHA-256: <code>{dossier.manifestSha256}</code></div>
          </div>

          <div className="space-y-2">
            {dossier.checks.map((c) => {
              const S = statusStyle[c.status];
              return (
                <details key={c.id} className="rounded-lg border p-3">
                  <summary className="flex items-center gap-3 cursor-pointer">
                    <S.icon size={18} className={S.cls} />
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{c.id}</span>
                    <span className="font-semibold flex-1">{c.title}</span>
                    <span className="text-xs text-slate-500">{c.executionTimeMs} ms</span>
                  </summary>
                  <div className="mt-2 text-sm space-y-1">
                    <div className="text-slate-500">{c.requirementRef}</div>
                    <div>{c.description}</div>
                    <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded overflow-auto">{JSON.stringify(c.evidence, null, 2)}</pre>
                  </div>
                </details>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">
            Warnings indicate checks that are not yet fully automated and need manual witness testing. This report supports, but does not replace, a formal validation package reviewed by your QA.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  const color = tone === 'ok' ? 'text-emerald-500' : tone === 'bad' ? 'text-red-500' : '';
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-xl font-black ${color}`}>{value}</div>
    </div>
  );
}
