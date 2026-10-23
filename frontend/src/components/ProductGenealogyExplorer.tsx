/**
 * ============================================================================
 * FILE: frontend/src/components/ProductGenealogyExplorer.tsx
 * ============================================================================
 * Enterprise Manufacturing Execution System (MES) - Universal Product Genealogy
 *
 * Implements the 5W1H Product Genealogy Framework:
 *  - WHAT: Assembled BOM components, quantities, serial/lot codes
 *  - WHERE: Tier-1 suppliers, material lots, warehouse storage bins
 *  - WHO: Dual Role-Gated Electronic Signatures (Performer + Verifier)
 *  - WHEN: Station execution timestamps, cycle takt times
 *  - HOW: Recipe specs, work centers, torque values, QC checkpoints
 *  - WHERE NOW: Real-time physical/logistical lifecycle (Warehouse, Dispatch, Line)
 *
 * Scaled Target:
 *  - 100 Serialized Units (SEAT-0001 to SEAT-0100)
 *  - 12 Component Types
 *  - 6 Assembly Stations
 *  - 5 Qualified Suppliers
 *  - 10 Material Lots
 *  - 8 Operators & Inspectors
 *  - 1 Defective Material Lot (LOT-RECL-2026-DEF)
 *  - 1 Forward Recall Simulation Engine
 *
 * @compliance IATF 16949 Section 8.5.2, FDA 21 CFR Part 11, GAMP 5
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Truck,
  Warehouse,
  Factory,
  Clock,
  QrCode,
  FileText,
  Check,
  Printer,
  RefreshCw,
  UserCheck,
  Cpu,
  ArrowRight,
  Lock,
  Layers3,
  ExternalLink
} from 'lucide-react';
import { getApiUrl } from '../config';

interface ProductGenealogyExplorerProps {
  token: string | null;
  initialSerial?: string;
  onOpenWorkstation?: () => void;
}

export default function ProductGenealogyExplorer({
  token,
  initialSerial = 'SEAT-0001',
  onOpenWorkstation
}: ProductGenealogyExplorerProps) {
  // 100-Unit Fleet State
  const [units, setUnits] = useState<any[]>([]);
  const [selectedSerial, setSelectedSerial] = useState<string>(initialSerial);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(false);

  // 5W1H Dossier State
  const [genealogyData, setGenealogyData] = useState<any>(null);
  const [isLoadingGenealogy, setIsLoadingGenealogy] = useState<boolean>(false);
  const [activeDossierTab, setActiveDossierTab] = useState<'what' | 'where' | 'who' | 'when' | 'how' | 'whereNow'>('what');

  // Recall Simulation State
  const [showRecallModal, setShowRecallModal] = useState<boolean>(false);
  const [recallLotQuery, setRecallLotQuery] = useState<string>('LOT-RECL-2026-DEF');
  const [recallResult, setRecallResult] = useState<any>(null);
  const [isAnalyzingRecall, setIsAnalyzingRecall] = useState<boolean>(false);
  const [quarantineSuccessMsg, setQuarantineSuccessMsg] = useState<string>('');

  // 1. Fetch Fleet of 100 Serialized Units
  const fetchUnits = async () => {
    if (!token) return;
    setIsLoadingUnits(true);
    try {
      const res = await fetch(getApiUrl('/inventory/serialized-units'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnits(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Failed to load serialized units:', err);
    } finally {
      setIsLoadingUnits(false);
    }
  };

  // 2. Fetch 5W1H Genealogy Dossier for Selected Serial
  const fetchGenealogy = async (sn: string) => {
    if (!token || !sn) return;
    setIsLoadingGenealogy(true);
    try {
      const res = await fetch(getApiUrl(`/inventory/serialized-units/${sn.trim().toUpperCase()}/genealogy`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGenealogyData(data);
      }
    } catch (err) {
      console.warn(`Failed to fetch genealogy for ${sn}:`, err);
    } finally {
      setIsLoadingGenealogy(false);
    }
  };

  // 3. Execute Recall Simulation
  const executeRecallAnalysis = async (lot: string) => {
    if (!token || !lot) return;
    setIsAnalyzingRecall(true);
    setQuarantineSuccessMsg('');
    try {
      const res = await fetch(getApiUrl(`/inventory/recall-analysis/${lot.trim().toUpperCase()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecallResult(data);
      }
    } catch (err) {
      console.warn('Recall analysis error:', err);
    } finally {
      setIsAnalyzingRecall(false);
    }
  };

  // 4. Quarantine All Affected Units
  const handleQuarantineBatch = async (serialNumbers: string[]) => {
    if (!token || !serialNumbers || serialNumbers.length === 0) return;
    try {
      const res = await fetch(getApiUrl('/inventory/serialized-units/quarantine-batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ serialNumbers })
      });
      if (res.ok) {
        setQuarantineSuccessMsg(`Successfully locked and quarantined ${serialNumbers.length} affected serial unit(s) in PostgreSQL!`);
        fetchUnits();
        if (selectedSerial && serialNumbers.includes(selectedSerial)) {
          fetchGenealogy(selectedSerial);
        }
      }
    } catch (err) {
      console.warn('Quarantine request error:', err);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [token]);

  useEffect(() => {
    if (selectedSerial) {
      fetchGenealogy(selectedSerial);
    }
  }, [selectedSerial, token]);

  // Filtered fleet list
  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      u.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.dispatch_customer && u.dispatch_customer.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.warehouse_location && u.warehouse_location.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'DEFECTIVE_RECALL') return Boolean(u.metadata?.hasDefectiveRecliner);
    return u.status === statusFilter;
  });

  // Fleet Counts Summary
  const countTotal = units.length;
  const countFinished = units.filter((u) => u.status === 'FINISHED_INVENTORY').length;
  const countDispatched = units.filter((u) => u.status === 'DISPATCHED').length;
  const countAssembly = units.filter((u) => u.status === 'UNDER_ASSEMBLY').length;
  const countRework = units.filter((u) => u.status === 'REWORK').length;
  const countRejected = units.filter((u) => u.status === 'REJECTED').length;
  const countDefectiveLot = units.filter((u) => u.metadata?.hasDefectiveRecliner).length;

  return (
    <div className="space-y-4 text-left font-sans text-slate-800 dark:text-slate-200">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & KPI METRICS SUMMARY                                   */}
      {/* ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25">
              AUTOMOTIVE PRODUCT GENEALOGY
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">
              IATF 16949 / 21 CFR PART 11
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25">
              5W1H TRACEABILITY LEDGER
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Seat Assembly Genealogy & Fleet Ledger</span>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              [WO-SEAT-2026-001 • Front Driver Seat Assembly SEAT-DRV-101]
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full lifecycle traceability for 100 serialized seats across 6 assembly stations, 5 qualified Tier-1 suppliers, and dual electronic signatures.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowRecallModal(true);
              executeRecallAnalysis('LOT-RECL-2026-DEF');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition cursor-pointer active:scale-95"
            title="Launch Forward Recall Simulation for compromised supplier lots"
          >
            <AlertTriangle size={15} />
            <span>Recall Simulation (LOT-RECL-2026-DEF)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchUnits();
              if (selectedSerial) fetchGenealogy(selectedSerial);
            }}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#102237] dark:hover:bg-[#1F3A5C] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] transition cursor-pointer"
            title="Refresh Fleet Data"
          >
            <RefreshCw size={15} className={isLoadingUnits ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-3 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Serialized</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-white">{countTotal}</span>
            <span className="text-[10px] font-bold text-blue-500">Target 100</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-3 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Finished Goods</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{countFinished}</span>
            <span className="text-[10px] font-bold text-slate-400">In WH-FG</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-3 shadow-sm">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Dispatched</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{countDispatched}</span>
            <span className="text-[10px] font-bold text-slate-400">Tata Motors</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-3 shadow-sm">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Under Assembly</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{countAssembly}</span>
            <span className="text-[10px] font-bold text-slate-400">Stations 1-5</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-3 shadow-sm">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">Rework / Hold</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{countRework + countRejected}</span>
            <span className="text-[10px] font-bold text-slate-400">MRB Bay</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#142A45] border-2 border-rose-500/40 rounded-xl p-3 shadow-sm bg-rose-500/5">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle size={11} /> Recall Affected
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{countDefectiveLot}</span>
            <span className="text-[10px] font-bold text-rose-500 font-mono">LOT-RECL-DEF</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. MAIN 2-COLUMN WORKBENCH: FLEET SELECTOR + 5W1H DOSSIER             */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* =================================================================== */}
        {/* LEFT COLUMN: 100-SEAT FLEET MATRIX SELECTOR (4 Cols)                */}
        {/* =================================================================== */}
        <div className="lg:col-span-4 bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1F3A5C]">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers3 size={15} className="text-blue-500" />
              <span>Serialized Fleet (100 Units)</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              {filteredUnits.length}/{countTotal}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search serial # (e.g. SEAT-0014) or customer..."
              className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] text-slate-900 dark:text-white text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 shadow-inner font-medium"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1 text-[10px] font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All ({countTotal})
            </button>
            <button
              onClick={() => setStatusFilter('FINISHED_INVENTORY')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${
                statusFilter === 'FINISHED_INVENTORY'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              FG ({countFinished})
            </button>
            <button
              onClick={() => setStatusFilter('DISPATCHED')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${
                statusFilter === 'DISPATCHED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              Dispatched ({countDispatched})
            </button>
            <button
              onClick={() => setStatusFilter('UNDER_ASSEMBLY')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${
                statusFilter === 'UNDER_ASSEMBLY'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              Line ({countAssembly})
            </button>
            <button
              onClick={() => setStatusFilter('DEFECTIVE_RECALL')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${
                statusFilter === 'DEFECTIVE_RECALL'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
              }`}
            >
              ⚠ Recall Lot ({countDefectiveLot})
            </button>
          </div>

          {/* Scrollable Unit Grid */}
          <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
            {filteredUnits.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No serialized units found matching criteria.
              </div>
            ) : (
              filteredUnits.map((u) => {
                const isSelected = selectedSerial === u.serial_number;
                const isDefective = Boolean(u.metadata?.hasDefectiveRecliner);

                let badgeColor = 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
                if (u.status === 'FINISHED_INVENTORY') badgeColor = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
                if (u.status === 'DISPATCHED') badgeColor = 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
                if (u.status === 'UNDER_ASSEMBLY') badgeColor = 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
                if (u.status === 'REWORK') badgeColor = 'bg-purple-500/15 text-purple-600 dark:text-purple-400';
                if (u.status === 'REJECTED') badgeColor = 'bg-rose-500/15 text-rose-600 dark:text-rose-400';

                return (
                  <div
                    key={u.serial_number}
                    onClick={() => setSelectedSerial(u.serial_number)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30'
                        : isDefective
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 hover:border-rose-400'
                        : 'bg-slate-50 dark:bg-[#102237] border-slate-200 dark:border-[#1F3A5C] hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        isDefective ? 'bg-rose-500 animate-pulse' : isSelected ? 'bg-blue-600' : 'bg-slate-400'
                      }`} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {u.serial_number}
                          </span>
                          {isDefective && (
                            <span className="text-[9px] font-bold px-1 rounded bg-rose-500 text-white">
                              RECALL
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[170px]">
                          {u.dispatch_customer ? u.dispatch_customer.split(' (')[0] : u.warehouse_location}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                        {u.status.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                        Op {u.current_operation_no}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: 5W1H DEEP PRODUCT GENEALOGY DOSSIER (8 Cols)          */}
        {/* =================================================================== */}
        <div className="lg:col-span-8 space-y-3.5">
          {isLoadingGenealogy ? (
            <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-12 text-center text-xs text-slate-400 shadow-sm">
              <RefreshCw size={24} className="animate-spin mx-auto text-blue-500 mb-2" />
              <span>Resolving full 5W1H Product Genealogy for {selectedSerial}...</span>
            </div>
          ) : !genealogyData ? (
            <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-12 text-center text-xs text-slate-400 shadow-sm">
              Select a serialized unit on the left to inspect its complete Product Genealogy.
            </div>
          ) : (
            <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 shadow-sm space-y-4">
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F3A5C] gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="font-mono text-blue-600 dark:text-blue-400">{genealogyData.unit.serial_number}</span>
                      <span>—</span>
                      <span>{genealogyData.unit.product_name}</span>
                    </h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                      {genealogyData.unit.product_sku}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Work Order: <strong className="text-slate-700 dark:text-slate-300">{genealogyData.unit.wo_number}</strong> • 
                    Status: <strong className="text-emerald-600 dark:text-emerald-400">{genealogyData.unit.status}</strong> • 
                    Location: <strong className="text-slate-700 dark:text-slate-300">{genealogyData.unit.warehouse_location}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {genealogyData.whereNow.hasDefectivePart && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                      <AlertTriangle size={14} /> RECALL LOT
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#102237] dark:hover:bg-[#1F3A5C] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-[#1F3A5C] transition flex items-center gap-1 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Print Dossier</span>
                  </button>
                </div>
              </div>

              {/* 5W1H Framework Tab Navigation */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-[#102237] rounded-lg border border-slate-200 dark:border-[#1F3A5C]">
                <button
                  onClick={() => setActiveDossierTab('what')}
                  className={`flex-1 min-w-[90px] py-1.5 px-2 rounded text-xs font-bold transition text-center cursor-pointer ${
                    activeDossierTab === 'what'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  WHAT (12 Parts)
                </button>

                <button
                  onClick={() => setActiveDossierTab('where')}
                  className={`flex-1 min-w-[90px] py-1.5 px-2 rounded text-xs font-bold transition text-center cursor-pointer ${
                    activeDossierTab === 'where'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  WHERE (5 Suppliers)
                </button>

                <button
                  onClick={() => setActiveDossierTab('who')}
                  className={`flex-1 min-w-[90px] py-1.5 px-2 rounded text-xs font-bold transition text-center cursor-pointer ${
                    activeDossierTab === 'who'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  WHO (Dual E-Signs)
                </button>

                <button
                  onClick={() => setActiveDossierTab('when')}
                  className={`flex-1 min-w-[90px] py-1.5 px-2 rounded text-xs font-bold transition text-center cursor-pointer ${
                    activeDossierTab === 'when'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  WHEN (Timeline)
                </button>

                <button
                  onClick={() => setActiveDossierTab('how')}
                  className={`flex-1 min-w-[90px] py-1.5 px-2 rounded text-xs font-bold transition text-center cursor-pointer ${
                    activeDossierTab === 'how'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  HOW (QC & Torque)
                </button>

                <button
                  onClick={() => setActiveDossierTab('whereNow')}
                  className={`flex-1 min-w-[90px] py-1.5 px-2 rounded text-xs font-bold transition text-center cursor-pointer ${
                    activeDossierTab === 'whereNow'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  WHERE NOW
                </button>
              </div>

              {/* ============================================================= */}
              {/* DOSSIER CONTENT PANELS                                        */}
              {/* ============================================================= */}

              {/* 1. WHAT: BOM Components Assembled */}
              {activeDossierTab === 'what' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Assembled BOM Component Pedigree ({genealogyData.what.length} Records)
                    </span>
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <ShieldCheck size={12} /> 100% Optical Barcode Verified
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-[#1F3A5C] rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 dark:bg-[#102237] text-slate-500 font-bold text-[11px] border-b border-slate-200 dark:border-[#1F3A5C]">
                        <tr>
                          <th className="p-2.5">Part Code</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5">Supplier Material Lot</th>
                          <th className="p-2.5">Supplier Name</th>
                          <th className="p-2.5">WH Bin</th>
                          <th className="p-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#1F3A5C]">
                        {genealogyData.what.map((comp: any, idx: number) => {
                          const isDefective = comp.componentLot === 'LOT-RECL-2026-DEF';
                          return (
                            <tr key={idx} className={isDefective ? 'bg-rose-500/10' : 'hover:bg-slate-50 dark:hover:bg-[#102237]/50'}>
                              <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                {comp.componentCode}
                              </td>
                              <td className="p-2.5 font-medium">{comp.componentName}</td>
                              <td className="p-2.5 font-mono font-bold">
                                <span className={isDefective ? 'text-rose-600 dark:text-rose-400 font-extrabold' : ''}>
                                  {comp.componentLot}
                                </span>
                                {isDefective && (
                                  <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-rose-600 text-white font-bold">
                                    NCR-089
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-500 dark:text-slate-400">{comp.supplierName}</td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-400">{comp.location}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {comp.status}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. WHERE: Upstream Suppliers & Inventory Provenance */}
              {activeDossierTab === 'where' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Qualified Tier-1 Automotive Suppliers & Inbound Inventory
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {genealogyData.where.map((supp: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {supp.supplierName}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                            {supp.supplierCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Receiving Bin: <strong className="text-slate-700 dark:text-slate-300">{supp.inventoryLocation}</strong></span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-semibold text-slate-400 uppercase text-[10px] mr-1">Supplied:</span>
                          {supp.componentsSupplied.join(', ')}
                        </div>
                        <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-bold border-t border-slate-200 dark:border-[#1F3A5C]">
                          <span>IATF 16949 Accredited</span>
                          <span>Certificate of Analysis (CoA): PASS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. WHO: Dual Role-Gated Electronic Signatures */}
              {activeDossierTab === 'who' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      21 CFR Part 11 Dual Electronic Signatures (Performer + Verifier)
                    </span>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/25">
                      Cryptographically Linked
                    </span>
                  </div>

                  <div className="space-y-2">
                    {genealogyData.who.map((signItem: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-600/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                            {signItem.operationNo / 10}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white block">
                              Station 0{signItem.operationNo / 10}: {signItem.operationName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Signed: {new Date(signItem.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Operator:</span>
                            <strong className="text-blue-600 dark:text-blue-400">{signItem.operator.signature}</strong>
                            <UserCheck size={12} className="text-blue-500" />
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Supervisor:</span>
                            <strong className="text-purple-600 dark:text-purple-400">{signItem.inspector.signature}</strong>
                            <ShieldCheck size={12} className="text-purple-500" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. WHEN: Station Timeline & Takt Times */}
              {activeDossierTab === 'when' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Manufacturing Process Sequence & Timing
                  </span>

                  <div className="relative pl-6 space-y-4 border-l-2 border-blue-500/30 dark:border-blue-500/20 my-2">
                    {genealogyData.when.map((step: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div className="bg-slate-50 dark:bg-[#102237] p-2.5 rounded-lg border border-slate-200 dark:border-[#1F3A5C] flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white block">
                              Station 0{step.operationNo / 10}: {step.operationName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Timestamp: {new Date(step.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            COMPLETED
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. HOW: Recipe Specs, Machines & QC Checks */}
              {activeDossierTab === 'how' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Recipe Specifications, Machines & Quality Telemetry
                  </span>

                  <div className="space-y-2">
                    {genealogyData.how.map((h: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Station 0{h.operationNo / 10}: {h.operationName}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 font-bold">{h.workCenter}</span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">{h.machineId}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                          "{h.inspectionText}"
                        </p>

                        {h.parameters && Object.keys(h.parameters).length > 0 && (
                          <div className="p-2 rounded bg-white dark:bg-[#142A45] border border-slate-200 dark:border-[#1F3A5C] flex flex-wrap gap-3 text-[11px]">
                            {Object.entries(h.parameters).map(([key, val]: any) => (
                              <div key={key} className="flex items-center gap-1">
                                <span className="text-slate-400 font-mono text-[10px]">{key}:</span>
                                <strong className="text-slate-800 dark:text-slate-200">{String(val)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. WHERE NOW: Current Physical & Logistical State */}
              {activeDossierTab === 'whereNow' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Current Lifecycle & Physical Location State
                  </span>

                  <div className="p-4 bg-slate-50 dark:bg-[#102237] border-2 border-blue-500/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Warehouse className="text-blue-500" size={20} />
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                            {genealogyData.whereNow.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Physical Location: <strong className="text-blue-600 dark:text-blue-400">{genealogyData.whereNow.warehouseLocation}</strong>
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        genealogyData.whereNow.status === 'FINISHED_INVENTORY'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : genealogyData.whereNow.status === 'DISPATCHED'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}>
                        {genealogyData.whereNow.status}
                      </span>
                    </div>

                    {genealogyData.whereNow.dispatchCustomer && (
                      <div className="p-3 bg-white dark:bg-[#142A45] rounded-lg border border-slate-200 dark:border-[#1F3A5C] space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 uppercase text-[10px] font-bold">Dispatched To OEM:</span>
                          <strong className="text-blue-600 dark:text-blue-400">{genealogyData.whereNow.dispatchCustomer}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Delivery Dispatch Note:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{genealogyData.whereNow.dispatchNote}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Dispatch Departure Date:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {genealogyData.whereNow.dispatchDate ? new Date(genealogyData.whereNow.dispatchDate).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}

                    {genealogyData.whereNow.hasDefectivePart && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                        <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">RECALL CONTAINMENT NOTICE</strong>
                          <span>
                            This unit contains defective supplier lot <strong>LOT-RECL-2026-DEF</strong> (Recliner mechanism). If in warehouse, shipping hold is enforced. If dispatched, customer recall bulletin applies.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. RECALL SIMULATION MODAL (FORWARD BLAST RADIUS ANALYSIS)            */}
      {/* ===================================================================== */}
      {showRecallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#142A45] border-2 border-rose-500/50 rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F3A5C]">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle size={20} />
                <h3 className="text-base font-extrabold uppercase tracking-wide">
                  Forward Supply Chain Recall Simulation (Blast Radius)
                </h3>
              </div>
              <button
                onClick={() => setShowRecallModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm px-2 py-1 rounded"
              >
                ✕ Close
              </button>
            </div>

            {/* Input Form */}
            <div className="flex gap-2">
              <input
                type="text"
                value={recallLotQuery}
                onChange={(e) => setRecallLotQuery(e.target.value)}
                placeholder="Enter compromised supplier lot (e.g. LOT-RECL-2026-DEF)..."
                className="flex-1 bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] text-slate-900 dark:text-white text-xs rounded-lg px-3 py-2 font-mono font-bold"
              />
              <button
                onClick={() => executeRecallAnalysis(recallLotQuery)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Simulate Blast Radius
              </button>
            </div>

            {quarantineSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{quarantineSuccessMsg}</span>
              </div>
            )}

            {isAnalyzingRecall ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto text-rose-500 mb-2" />
                <span>Calculating supply chain blast radius for {recallLotQuery}...</span>
              </div>
            ) : recallResult ? (
              <div className="space-y-4">
                {/* Metrics Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-rose-500 uppercase block">Total Affected</span>
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400">{recallResult.totalAffected} Seats</span>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Blast Radius %</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{recallResult.blastRadiusPct}%</span>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">In FG Warehouse</span>
                    <span className="text-xl font-black text-amber-500">{recallResult.summary.inWarehouseCount}</span>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">At OEM Customer</span>
                    <span className="text-xl font-black text-blue-500">{recallResult.summary.dispatchedCount}</span>
                  </div>
                </div>

                {/* Containment Protocol */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Recommended Containment Protocol (IATF 16949 Section 10.2)
                  </h4>
                  <div className="space-y-1.5">
                    {recallResult.containmentActions.map((act: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white block">{act.target}</strong>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{act.action}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          act.urgency === 'IMMEDIATE'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : act.urgency === 'CRITICAL'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}>
                          {act.urgency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Affected Serial Numbers Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Identified Serialized Units ({recallResult.affectedUnits.length})
                    </h4>
                    <button
                      onClick={() => handleQuarantineBatch(recallResult.affectedUnits.map((u: any) => u.serialNumber))}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock size={12} />
                      <span>1-Click Quarantine All In Warehouse</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-[#1F3A5C] rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 dark:bg-[#102237] text-slate-500 font-bold text-[11px] border-b border-slate-200 dark:border-[#1F3A5C]">
                        <tr>
                          <th className="p-2.5">Serial #</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Location / Customer</th>
                          <th className="p-2.5">Component</th>
                          <th className="p-2.5 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#1F3A5C]">
                        {recallResult.affectedUnits.map((u: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#102237]/50">
                            <td className="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">{u.serialNumber}</td>
                            <td className="p-2.5 font-semibold">{u.currentStatus}</td>
                            <td className="p-2.5 text-slate-500 dark:text-slate-400">
                              {u.dispatchCustomer || u.warehouseLocation}
                            </td>
                            <td className="p-2.5 font-mono text-[11px]">{u.componentCode} ({u.componentName})</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedSerial(u.serialNumber);
                                  setShowRecallModal(false);
                                }}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                View 5W1H
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
