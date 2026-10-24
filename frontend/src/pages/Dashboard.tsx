import React, { useEffect, useState, useRef } from 'react';
import { useShopfloorStore } from '../context/shopfloorStore';
import {
  Award,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  Flame,
  ChevronDown
} from 'lucide-react';
import { getApiUrl } from '../config';

const getDefaultOee = (status: string, code: string) => {
  if (status === 'MAINTENANCE' || status === 'BREAKDOWN') return 0;
  if (status === 'RUNNING') return 88.5;
  if (status === 'SETUP') return 65.5;
  const num = parseInt(code.replace(/\D/g, '')) || 1;
  const offset = (num * 3) % 15;
  return 72.0 + offset;
};

export default function Dashboard() {
  const { liveMachineOEE, liveMachineStatuses, liveGoodCounts, liveScrapCounts, token } = useShopfloorStore();
  const [dbData, setDbData] = useState<any>(null);

  // Work Orders state connected to ugam_mes database with synchronized fallbacks
  const [workOrders, setWorkOrders] = useState<any[]>([
    {
      id: '80111111-0001-1111-1111-111111111111',
      woNumber: 'WO-2026-001',
      productSku: 'FG-001',
      productName: 'Automotive Control Pin',
      targetQuantity: 5000,
      completedQuantity: 2850,
      scrapQuantity: 32,
      status: 'IN_PROGRESS',
      recipeCode: 'RT-004 Rev A'
    },
    {
      id: '80111111-0004-1111-1111-111111111111',
      woNumber: 'WO-2026-004',
      productSku: 'FG-001',
      productName: 'Automotive Control Pin',
      targetQuantity: 3500,
      completedQuantity: 0,
      scrapQuantity: 0,
      status: 'PLANNED',
      recipeCode: 'RT-004 Rev A'
    },
    {
      id: '80111111-0005-1111-1111-111111111111',
      woNumber: 'WO-2026-005',
      productSku: 'FG-001',
      productName: 'Automotive Control Pin',
      targetQuantity: 4000,
      completedQuantity: 0,
      scrapQuantity: 0,
      status: 'RELEASED',
      recipeCode: 'RT-004 Rev A'
    },
    {
      id: '80111111-0000-1111-1111-111111111111',
      woNumber: 'WO-2026-000',
      productSku: 'FG-001',
      productName: 'Automotive Control Pin',
      targetQuantity: 5000,
      completedQuantity: 4960,
      scrapQuantity: 40,
      status: 'COMPLETED',
      recipeCode: 'RT-004 Rev A'
    },
    {
      id: '80111111-0002-1111-1111-111111111111',
      woNumber: 'PO-260002',
      productSku: 'FG-002',
      productName: 'Hydraulic Seal Assembly',
      targetQuantity: 3000,
      completedQuantity: 495,
      scrapQuantity: 5,
      status: 'RELEASED',
      recipeCode: 'RT-005 Rev A'
    },
    {
      id: '80111111-0003-1111-1111-111111111111',
      woNumber: 'PO-260003',
      productSku: 'INT-001',
      productName: 'Machined Steel Pin',
      targetQuantity: 8000,
      completedQuantity: 950,
      scrapQuantity: 34,
      status: 'IN_PROGRESS',
      recipeCode: 'RT-001 Rev A'
    }
  ]);
  const [selectedWoId, setSelectedWoId] = useState<string>('80111111-0001-1111-1111-111111111111');
  const [isWoDropdownOpen, setIsWoDropdownOpen] = useState(false);
  const woDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (woDropdownRef.current && !woDropdownRef.current.contains(e.target as Node)) {
        setIsWoDropdownOpen(false);
      }
    };
    if (isWoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWoDropdownOpen]);

  // Fetch actual data from backend if available, otherwise fallback to high fidelity simulation
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    Promise.all([
      fetch(getApiUrl('/compliance/deviations'), { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(getApiUrl('/materials/expiry'), { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(getApiUrl('/work-orders'), { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(getApiUrl('/equipment/status'), { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([deviations, expiry, liveWorkOrders, equipment]) => {
      setDbData({ deviations, expiry, workOrders: liveWorkOrders, equipment });
      if (liveWorkOrders && Array.isArray(liveWorkOrders) && liveWorkOrders.length > 0) {
        setWorkOrders(liveWorkOrders);
        const inProg = liveWorkOrders.find((w: any) => w.status === 'IN_PROGRESS') || liveWorkOrders[0];
        if (inProg) {
          setSelectedWoId(inProg.id);
        }
      }
    }).catch(err => {
      console.warn('Backend metrics fetch failed, using simulation: ', err);
    });
  }, [token]);

  // Aggregate stats from database equipment list
  const activeMachines = (dbData?.equipment && dbData.equipment.length > 0) ? dbData.equipment : [
    { id: 'e1111111-0001-1111-1111-111111111111', name: 'Automatic Bar Cutter 01', code: 'CUT-01', status: 'RUNNING' },
    { id: 'e1111111-0002-1111-1111-111111111111', name: 'CNC Turning Center 01', code: 'CNC-01', status: 'RUNNING' },
    { id: 'e1111111-0003-1111-1111-111111111111', name: 'Deburring Machine 01', code: 'DBR-01', status: 'RUNNING' },
    { id: 'e1111111-0004-1111-1111-111111111111', name: 'Heat Treatment Furnace 01', code: 'HT-01', status: 'RUNNING' },
    { id: 'e1111111-0005-1111-1111-111111111111', name: 'Rubber Moulding Machine 01', code: 'RM-01', status: 'RUNNING' },
    { id: 'e1111111-0006-1111-1111-111111111111', name: 'Visual Optical Inspection Station 01', code: 'QC-01', status: 'RUNNING' },
    { id: 'e1111111-0007-1111-1111-111111111111', name: 'Assembly Station 01', code: 'ASM-01', status: 'RUNNING' },
    { id: 'e1111111-0008-1111-1111-111111111111', name: 'Functional Torque & Load Test Bench 01', code: 'TEST-01', status: 'RUNNING' },
    { id: 'e1111111-0009-1111-1111-111111111111', name: 'Coordinate Measuring Machine 01', code: 'QC-02', status: 'RUNNING' },
  ];

  // Calculations
  const runningCount = activeMachines.filter((m: any) => (liveMachineStatuses[m.id] || m.status) === 'RUNNING').length;
  const avgOee = activeMachines.length > 0 
    ? Math.round(activeMachines.reduce((sum: number, m: any) => {
        const s = liveMachineStatuses[m.id] || m.status;
        const val = liveMachineOEE[m.id] !== undefined ? liveMachineOEE[m.id] : getDefaultOee(s, m.code);
        return sum + val;
      }, 0) / activeMachines.length)
    : 85;
  
  // Deviations calculation
  const openDeviations = dbData?.deviations ? dbData.deviations.filter((d: any) => d.status === 'OPEN').length : 2;
  const resolvedDeviations = dbData?.deviations ? dbData.deviations.filter((d: any) => d.status === 'RESOLVED').length : 12;
  const totalDeviations = openDeviations + resolvedDeviations;
  
  // Right-First-Time % = (1 - (openDeviations / totalBatches)) * 100
  const totalBatches = dbData?.workOrders?.length || workOrders.length;
  const rftRate = totalBatches > 0 ? Math.round((1 - (openDeviations / totalBatches)) * 100 * 10) / 10 : 98.4;
  
  // Expiring Lots
  const expiringLots = dbData?.expiry?.length || 3;

  // Active Running Batch Computations (fixing 0 falsy bug)
  const selectedWo = workOrders.find((w: any) => w.id === selectedWoId) || workOrders[0];
  const selectableWorkOrders = workOrders.filter((w: any) => w.id !== selectedWoId);

  const targetQty = Number(selectedWo?.targetQuantity ?? 5000);
  const currentGood = Number(selectedWo?.completedQuantity ?? 0);
  const currentScrap = Number(selectedWo?.scrapQuantity ?? 0);
  const totalProduced = currentGood + currentScrap;
  const batchYield = totalProduced > 0 ? ((currentGood / totalProduced) * 100).toFixed(1) : '100.0';
  const progressPct = targetQty > 0 ? Math.min(Math.round((currentGood / targetQty) * 100), 100) : 0;
  const remainingQty = Math.max(targetQty - currentGood, 0);

  const lineName = selectedWo?.productSku === 'FG-002' 
    ? 'Line 2 (Hydraulic Seal Assembly Line)' 
    : selectedWo?.productSku === 'INT-001' 
    ? 'Line 1 (CNC Precision Machining Line)' 
    : 'Line 1 (Control Pin Assembly Line)';
  const recipeCode = selectedWo?.recipeCode || (selectedWo?.productSku === 'FG-002' ? 'RT-005 Rev A (Active)' : selectedWo?.productSku === 'INT-001' ? 'RT-001 Rev A (Active)' : 'RT-004 Rev A (Active)');

  return (
    <div className="space-y-2.5 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5">
        <div className="flex flex-col justify-start items-start text-left">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">GMP Compliant Batch OEE, Yield, & Regulatory Compliance Metrics</p>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
          FDA 21 CFR PART 11 MODE ACTIVE
        </div>
      </div>

      {/* Main OEE & Target Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* OEE Gauge */}
        <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm hover:shadow-md rounded-xl p-3 flex flex-col justify-between transition duration-200">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Overall Equipment OEE</span>
            <Activity size={15} className="text-blue-500" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{avgOee}%</span>
            <span className="text-[10px] text-emerald-500 font-bold">Within USP target</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${avgOee}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>Limit: &gt;75%</span>
              <span>{runningCount} / {activeMachines.length} Active</span>
            </div>
          </div>
        </div>

        {/* Right First Time (RFT) */}
        <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm hover:shadow-md rounded-xl p-3 flex flex-col justify-between transition duration-200">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Right First Time (RFT)</span>
            <Award size={15} className="text-emerald-500" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{rftRate}%</span>
            <span className="text-[10px] text-slate-400 font-medium">Target 98.0%</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${rftRate}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span className="text-emerald-400">{resolvedDeviations} CAPAs Closed</span>
              <span className="text-red-400">{openDeviations} Open</span>
            </div>
          </div>
        </div>

        {/* Yield Variance */}
        <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm hover:shadow-md rounded-xl p-3 flex flex-col justify-between transition duration-200">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Active Yield Variance</span>
            <Layers size={15} className="text-amber-500" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">±0.8%</span>
            <span className="text-[10px] text-emerald-500 font-semibold">Normal</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '92%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>USP Limit: ±2.0%</span>
              <span>API Weight Balance OK</span>
            </div>
          </div>
        </div>

        {/* Expiring Lots / Material Check */}
        <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm hover:shadow-md rounded-xl p-3 flex flex-col justify-between transition duration-200">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">FEFO Expiry Warnings</span>
            <Calendar size={15} className="text-rose-500" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{expiringLots}</span>
            <span className="text-[10px] text-rose-500 font-semibold">Lots expiring &lt; 30d</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700/80 pt-1 mt-0.5">
            <span>Action Required: FEFO Allocate</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 dark:bg-rose-500/25 text-rose-500 font-extrabold text-[9px]">CRITICAL</span>
          </div>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        {/* Active Running Batch Widget */}
        <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-md rounded-xl p-3.5 lg:col-span-2 flex flex-col justify-between space-y-2.5 min-h-[350px] h-full">
          {/* Top Badges Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded flex items-center gap-1 shadow-sm uppercase tracking-wider">
                <Flame size={12} className="animate-pulse" /> ACTIVE RUNNING BATCH
              </span>
              <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 font-bold text-[11px] px-2 py-0.5 rounded">
                {recipeCode}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-bold text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {selectedWo?.status === 'IN_PROGRESS' ? 'RUNNING IN PRODUCTION' : `${selectedWo?.status || 'ACTIVE'} STAGE`}
              </span>
              <span className="bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] px-2 py-0.5 rounded">
                {lineName}
              </span>
            </div>
          </div>

          {/* Form Row: Work Order Selection & Product Formulation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* WORK ORDER # with Excluded Active Item Dropdown */}
            <div className="space-y-0.5 relative" ref={woDropdownRef}>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase block">
                WORK ORDER #
              </label>
              <button
                type="button"
                onClick={() => setIsWoDropdownOpen(!isWoDropdownOpen)}
                className="w-full flex items-center justify-between bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-lg px-2.5 py-1.5 shadow-sm hover:border-blue-500 transition text-left cursor-pointer"
                title="Select another work order"
              >
                <span className="truncate">{selectedWo?.woNumber} — {selectedWo?.productSku} ({selectedWo?.status})</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform shrink-0 ml-1.5 ${isWoDropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options (EXCLUDES currently selected work order) */}
              {isWoDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-[#142A45] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden py-1 animate-scaleUp max-h-56 overflow-y-auto mes-scrollbar">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 dark:bg-[#102237] border-b border-slate-200 dark:border-slate-700/60">
                    Switch to another Work Order
                  </div>
                  {selectableWorkOrders.length > 0 ? (
                    selectableWorkOrders.map((wo) => (
                      <button
                        key={wo.id}
                        type="button"
                        onClick={() => {
                          setSelectedWoId(wo.id);
                          setIsWoDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition flex items-center justify-between cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{wo.woNumber} — {wo.productSku}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{wo.productName}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          wo.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                            : wo.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {wo.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">No other orders found</div>
                  )}
                </div>
              )}
            </div>

            {/* PRODUCT FORMULATION */}
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase block">
                PRODUCT FORMULATION
              </label>
              <div className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 flex items-center shadow-sm truncate">
                <span className="truncate">Product: <strong className="text-slate-900 dark:text-white">{selectedWo?.productName || selectedWo?.productSku || 'Active Production Formula'}</strong></span>
                <span className="ml-1.5 text-rose-600 dark:text-rose-400 font-extrabold font-mono shrink-0">[{selectedWo?.productSku || 'BATCH'}]</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-[#102237]/60 border border-slate-200/80 dark:border-slate-700/70 space-y-1">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-800 dark:text-slate-200">
                Batch Progress: <strong className="text-slate-900 dark:text-white">{currentGood.toLocaleString()}</strong> / {targetQty.toLocaleString()} PCS
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-extrabold text-xs">{progressPct}%</span>
            </div>

            {/* Dynamic Gradient Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #F5A623 0%, #E02020 100%)'
                }}
              />
            </div>

            <div className="flex flex-wrap justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Target: <strong className="text-slate-700 dark:text-slate-200">{targetQty.toLocaleString()} PCS</strong></span>
              <span>Yield: <strong className="text-emerald-500 font-bold">{batchYield}%</strong></span>
              <span>Line: <strong className="text-slate-700 dark:text-slate-200">{lineName}</strong></span>
            </div>
          </div>

          {/* 4 Bottom Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 mt-auto shrink-0">
            {/* GOOD OUTPUT */}
            <div className="py-2 px-2.5 bg-slate-50/80 dark:bg-[#102237] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl shadow-sm text-center flex flex-col justify-between">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase block mb-0.5">
                GOOD OUTPUT
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block leading-tight mb-0.5">
                {currentGood.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                PCS IN SPEC
              </span>
            </div>

            {/* SCRAP */}
            <div className="py-2 px-2.5 bg-slate-50/80 dark:bg-[#102237] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl shadow-sm text-center flex flex-col justify-between">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase block mb-0.5">
                SCRAP
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 block leading-tight mb-0.5">
                {currentScrap.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 tracking-wider">
                REJECTS
              </span>
            </div>

            {/* TARGET DELTA */}
            <div className="py-2 px-2.5 bg-slate-50/80 dark:bg-[#102237] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl shadow-sm text-center flex flex-col justify-between">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase block mb-0.5">
                TARGET DELTA
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block leading-tight mb-0.5">
                {remainingQty.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                REMAINING
              </span>
            </div>

            {/* BATCH STATUS */}
            <div className="py-2 px-2.5 bg-slate-50/80 dark:bg-[#102237] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl shadow-sm text-center flex flex-col justify-between">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase block mb-0.5">
                BATCH STATUS
              </span>
              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 block leading-tight mb-0.5 truncate">
                {selectedWo?.status}
              </span>
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                LIFECYCLE
              </span>
            </div>
          </div>
        </div>

        {/* Machine OEE comparison */}
        <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-md rounded-xl p-3.5 flex flex-col justify-between min-h-[350px] h-full">
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm whitespace-nowrap">Individual Equipment State</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono font-bold shrink-0">
                {activeMachines.length} Assets
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 uppercase tracking-wider">
              GMP QUALIFIED
            </span>
          </div>
          <div className="space-y-1.5 overflow-y-auto pr-1.5 flex-1 min-h-[200px] mes-scrollbar">
            {activeMachines.map((machine: any) => {
              const status = liveMachineStatuses[machine.id] || machine.status;
              const oee = liveMachineOEE[machine.id] !== undefined ? liveMachineOEE[machine.id] : getDefaultOee(status, machine.code);
              
              let statusColor = 'bg-slate-400 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
              if (status === 'RUNNING') statusColor = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
              else if (status === 'IDLE') statusColor = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
              else if (status === 'MAINTENANCE') statusColor = 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
              else if (status === 'BREAKDOWN') statusColor = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
              else if (status === 'SETUP') statusColor = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';

              let barColor = 'bg-emerald-500';
              if (oee < 70) barColor = 'bg-rose-500';
              else if (oee < 80) barColor = 'bg-amber-500';

              // Clean up the name if it has (EQxxx) appended in DB
              const cleanedName = machine.name.split(' (')[0];

              return (
                <div key={machine.id} className="space-y-1 pb-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[150px]">{cleanedName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{machine.code}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${oee}%` }}></div>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white min-w-[28px] text-right">{oee}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
