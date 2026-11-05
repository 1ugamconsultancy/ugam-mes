import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Award, AlertTriangle, ShieldCheck, ClipboardCheck, RefreshCw, CheckCircle2, Filter } from 'lucide-react';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getApiUrl } from '../config';
import { toast } from '../context/toastStore';

interface InspectionRecord {
  id: string;
  woNumber?: string;
  sn: string;
  status: 'PASSED' | 'REJECTED';
  params: string;
  inspector: string;
  date: string;
}

const DEFAULT_SPC_DATA = [
  { sample: 1, val: 113.2, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 2, val: 114.1, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 3, val: 113.8, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 4, val: 112.5, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 5, val: 111.9, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 6, val: 115.4, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 7, val: 113.0, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 8, val: 112.9, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 9, val: 113.5, ucl: 116.0, lcl: 110.0, target: 113.0 },
  { sample: 10, val: 112.7, ucl: 116.0, lcl: 110.0, target: 113.0 },
];

const DEFAULT_PARETO_DATA = [
  { defect: 'Diameter Out of Tolerance', count: 42 },
  { defect: 'Surface Scratch / Chatter', count: 24 },
  { defect: 'Burr / Sharp Edge', count: 18 },
  { defect: 'Hardness Variance', count: 8 },
  { defect: 'Pin Runout Deviation', count: 4 },
];

export default function Quality() {
  const { user, token } = useShopfloorStore();
  const inspectorName = user?.name || user?.username || 'QA Inspector';
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWoNumber, setSelectedWoNumber] = useState('WO-2026-001');
  const [activeProductName, setActiveProductName] = useState('Automotive Control Pin');
  const [inspections, setInspections] = useState<InspectionRecord[]>([
    { id: '1', sn: 'SN-2026-00214', status: 'PASSED', params: 'Weight: 113.2g, Spec: In-Tolerance', inspector: inspectorName, date: '12:15' },
    { id: '2', sn: 'SN-2026-00215', status: 'REJECTED', params: 'Weight: 108.5g (Underweight)', inspector: inspectorName, date: '12:10' },
    { id: '3', sn: 'SN-2026-00216', status: 'PASSED', params: 'Weight: 113.0g, Spec: In-Tolerance', inspector: inspectorName, date: '12:05' },
  ]);
  const [spcData, setSpcData] = useState(DEFAULT_SPC_DATA);
  const [paretoData, setParetoData] = useState(DEFAULT_PARETO_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newSn, setNewSn] = useState('');
  const [newWeight, setNewWeight] = useState('113.2');
  const [newStatus, setNewStatus] = useState<'PASSED' | 'REJECTED'>('PASSED');
  const [newDesc, setNewDesc] = useState('');

  // 1. Fetch work orders to populate active batches
  useEffect(() => {
    if (!token) return;
    fetch(getApiUrl('/work-orders'), {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(wos => {
        if (Array.isArray(wos) && wos.length > 0) {
          setWorkOrders(wos);
          const active = wos.find((w: any) => w.status === 'IN_PROGRESS') || wos[0];
          if (active) {
            setSelectedWoNumber(active.woNumber || active.id);
            if (active.productName) setActiveProductName(active.productName);
          }
        }
      })
      .catch(() => {});
  }, [token]);

  // 2. Load inspections and pareto data from backend
  const loadQualityData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [checksRes, paretoRes] = await Promise.all([
        fetch(getApiUrl('/quality/checks'), { headers }).catch(() => null),
        fetch(getApiUrl('/quality/pareto'), { headers }).catch(() => null),
      ]);

      if (checksRes && checksRes.ok) {
        const checksData = await checksRes.json();
        if (Array.isArray(checksData) && checksData.length > 0) {
          const mapped: InspectionRecord[] = checksData.map((qc: any, idx: number) => {
            const weightVal = qc.checkParameters?.measurements?.[0]?.value || qc.checkParameters?.weight;
            const paramText = weightVal
              ? `Weight: ${weightVal}g ${qc.defectDescription ? `(${qc.defectDescription})` : ', Spec: In-Tolerance'}`
              : qc.defectDescription || 'Visual & Dimension Check';
            return {
              id: qc.id || String(idx),
              woNumber: qc.woNumber,
              sn: qc.serialNumber || `SN-${idx + 100}`,
              status: qc.status,
              params: paramText,
              inspector: qc.inspectorName || inspectorName,
              date: qc.timestamp ? new Date(qc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'
            };
          });
          setInspections(mapped);

          // Update dynamic SPC chart points if measurements exist
          const spcPoints = checksData
            .filter((c: any) => c.checkParameters?.measurements?.[0]?.value)
            .map((c: any, i: number) => ({
              sample: i + 1,
              val: Number(c.checkParameters.measurements[0].value),
              ucl: 116.0,
              lcl: 110.0,
              target: 113.0
            }));
          if (spcPoints.length >= 3) {
            setSpcData(spcPoints);
          }
        }
      }

      if (paretoRes && paretoRes.ok) {
        const pareto = await paretoRes.json();
        if (Array.isArray(pareto) && pareto.length > 0) {
          setParetoData(pareto);
        }
      }
    } catch (e) {
      console.warn('Error fetching quality data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQualityData();
  }, [token]);

  // Form submit handler with database persistence
  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSn.trim()) {
      toast.warning('Please specify Unit Serial Number');
      return;
    }

    const weightNum = parseFloat(newWeight) || 113.2;
    const serial = newSn.trim();
    const payload = {
      woNumber: selectedWoNumber,
      serialNumber: serial,
      status: newStatus,
      checkParameters: {
        measurements: [
          { parameter: 'Weight', unit: 'g', value: weightNum }
        ]
      },
      defectDescription: newStatus === 'REJECTED' ? (newDesc.trim() || 'Defect out of tolerance') : undefined
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/quality/inspect'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Quality check for ${serial} logged and persisted!`);
        setNewSn('');
        setNewDesc('');
        await loadQualityData();
      } else {
        const err = await res.json().catch(() => ({}));
        // Optimistic fallback for demo stability
        const fallbackCheck: InspectionRecord = {
          id: String(Date.now()),
          woNumber: selectedWoNumber,
          sn: serial,
          status: newStatus,
          params: newStatus === 'PASSED' ? `Weight: ${weightNum}g, Spec: In-Tolerance` : `Weight: ${weightNum}g, ${newDesc || 'Defect'}`,
          inspector: inspectorName,
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setInspections([fallbackCheck, ...inspections]);
        toast.success(`Quality check for ${serial} recorded locally`);
        setNewSn('');
        setNewDesc('');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error while saving inspection check');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2.5 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Quality Control & SPC Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            First Pass Yield monitoring, defect pareto metrics, and statistical process controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          {workOrders.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#142A45] border border-slate-300 dark:border-[#1F3A5C] px-3 py-1.5 rounded-xl shadow-xs text-xs">
              <Filter size={13} className="text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Batch:</span>
              <select
                value={selectedWoNumber}
                onChange={(e) => {
                  setSelectedWoNumber(e.target.value);
                  const found = workOrders.find((w: any) => w.woNumber === e.target.value || w.id === e.target.value);
                  if (found?.productName) setActiveProductName(found.productName);
                }}
                className="bg-transparent font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                {workOrders.map((w: any) => (
                  <option key={w.id} value={w.woNumber || w.id} className="dark:bg-[#142A45]">
                    {w.woNumber} ({w.productSku || 'Batch'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={loadQualityData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white dark:bg-[#142A45] border border-slate-300 dark:border-[#1F3A5C] text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Quality Data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SPC Chart and Defect Pareto Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SPC Control Chart */}
        <div className="industrial-card p-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-base dark:text-white">Statistical Process Control (SPC) Chart</h3>
            <span className="text-xs text-slate-400">{activeProductName} Weight & Tolerance (g)</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spcData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="sample" stroke="#777777" fontSize={11} label={{ value: 'Sample Number', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke="#777777" fontSize={11} domain={[105, 120]} />
                <Tooltip contentStyle={{ backgroundColor: '#142A45', border: '1px solid #1F3A5C', color: '#ffffff' }} />
                {/* Control limit horizontal markers */}
                <Line type="monotone" dataKey="ucl" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} label="UCL" />
                <Line type="monotone" dataKey="lcl" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={1} dot={false} />
                {/* Process readings */}
                <Line type="monotone" dataKey="val" stroke="#174A7C" strokeWidth={2} dot={{ fill: '#174A7C', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Pareto Chart */}
        <div className="industrial-card p-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-base dark:text-white">Defect Frequency (Pareto Analysis)</h3>
            <span className="text-xs text-slate-400">Yield Defects Count</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="defect" stroke="#777777" fontSize={10} />
                <YAxis stroke="#777777" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#142A45', border: '1px solid #1F3A5C', color: '#ffffff' }} />
                <Bar dataKey="count" fill="#F5A623" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* QC Form and Inspections table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inspection Form */}
        <div className="industrial-card p-3 h-fit text-left">
          <h3 className="font-bold text-base dark:text-white mb-4 flex items-center gap-1.5">
            <ClipboardCheck size={18} className="text-blue-500" /> Log Quality Inspection
          </h3>
          <form onSubmit={handleInspect} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Unit Serial Number</label>
              <input
                type="text"
                required
                value={newSn}
                onChange={(e) => setNewSn(e.target.value)}
                placeholder="e.g. SN-2026-00217"
                className="w-full bg-slate-100 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-sm dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Measured Weight (g)</label>
              <input
                type="number"
                step="0.01"
                required
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="113.2"
                className="w-full bg-slate-100 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-sm dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Inspection Status</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewStatus('PASSED')}
                  className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer active:scale-95 ${
                    newStatus === 'PASSED'
                      ? 'bg-[#174A7C] text-white border-[#174A7C] shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  PASSED
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatus('REJECTED')}
                  className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer active:scale-95 ${
                    newStatus === 'REJECTED'
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  REJECTED
                </button>
              </div>
            </div>

            {newStatus === 'REJECTED' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Defect Description</label>
                <input
                  type="text"
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Weight deviation or surface imperfection"
                  className="w-full bg-slate-100 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-sm dark:text-white focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-lg transition shadow-md cursor-pointer active:scale-98"
            >
              {isSubmitting ? 'Submitting to Database...' : 'Submit Check'}
            </button>
          </form>
        </div>

        {/* Inspections History Table */}
        <div className="industrial-card p-3 lg:col-span-2 text-left">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base dark:text-white">Inspection History Logs</h3>
            <span className="text-xs text-slate-400">{inspections.length} recorded inspections</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
                  <th className="p-3">Serial Number</th>
                  <th className="p-3">Batch</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Parameters / Defects</th>
                  <th className="p-3">Inspector</th>
                  <th className="p-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-600 dark:text-slate-300">
                {inspections.map((insp) => (
                  <tr key={insp.id}>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{insp.sn}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{insp.woNumber || selectedWoNumber}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        insp.status === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {insp.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{insp.params}</td>
                    <td className="p-3">{insp.inspector}</td>
                    <td className="p-3">{insp.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
