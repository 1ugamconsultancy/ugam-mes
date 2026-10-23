import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopfloorStore } from '../context/shopfloorStore';
import { Activity, Play, Square, Settings, ShieldAlert, Cpu, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react';
import { getApiUrl } from '../config';

const getDefaultOee = (status: string, code: string) => {
  if (status === 'MAINTENANCE' || status === 'BREAKDOWN') return 0;
  if (status === 'RUNNING') return 88.5;
  if (status === 'SETUP') return 65.5;
  const num = parseInt(code.replace(/\D/g, '')) || 1;
  const offset = (num * 3) % 15;
  return 72.0 + offset;
};

export default function Monitoring() {
  const navigate = useNavigate();
  const { liveMachineStatuses, liveMachineOEE, liveGoodCounts, liveScrapCounts, updateLiveMachineState, token } = useShopfloorStore();
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [dbMachines, setDbMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchEquipment = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(getApiUrl('/equipment/status'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDbMachines(data);
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.warn('Failed to fetch equipment:', err);
    }
  }, [token]);

  // Initial fetch and dynamic periodic auto-polling every 3 seconds
  useEffect(() => {
    fetchEquipment();
    const interval = setInterval(() => {
      fetchEquipment();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchEquipment]);

  const defaultMachines = [
    { id: 'e1111111-0001-1111-1111-111111111111', name: 'Automatic Bar Cutter 01', description: 'Automatic Bar Cutter 01', code: 'CUT-01', workCenter: 'WC-CUT', equipmentType: 'CUTTING', status: 'RUNNING', lineName: 'Machining Line 1', areaName: 'Cutting Work Center', produced: 1200, scrap: 5 },
    { id: 'e1111111-0002-1111-1111-111111111111', name: 'CNC Turning Center 01', description: 'CNC Turning Center 01', code: 'CNC-01', workCenter: 'WC-CNC', equipmentType: 'CNC_LATHE', status: 'RUNNING', lineName: 'Machining Line 1', areaName: 'CNC Turning Work Center', produced: 500, scrap: 2 },
    { id: 'e1111111-0003-1111-1111-111111111111', name: 'Deburring Machine 01', description: 'Deburring Machine 01', code: 'DBR-01', workCenter: 'WC-DBR', equipmentType: 'DEBURRING', status: 'RUNNING', lineName: 'Machining Line 1', areaName: 'Deburring Work Center', produced: 1000, scrap: 1 },
    { id: 'e1111111-0004-1111-1111-111111111111', name: 'Heat Treatment Furnace 01', description: 'Heat Treatment Furnace 01', code: 'HT-01', workCenter: 'WC-HT', equipmentType: 'FURNACE', status: 'RUNNING', lineName: 'Machining Line 1', areaName: 'Heat Treatment Work Center', produced: 300, scrap: 0 },
    { id: 'e1111111-0005-1111-1111-111111111111', name: 'Rubber Moulding Machine 01', description: 'Rubber Moulding Machine 01', code: 'RM-01', workCenter: 'WC-RM', equipmentType: 'PRESS', status: 'RUNNING', lineName: 'Moulding Line 1', areaName: 'Rubber Moulding Work Center', produced: 600, scrap: 4 },
    { id: 'e1111111-0006-1111-1111-111111111111', name: 'Visual Optical Inspection Station 01', description: 'Visual Optical Inspection Station 01', code: 'QC-01', workCenter: 'WC-QC', equipmentType: 'INSPECTION', status: 'RUNNING', lineName: 'Moulding Line 1', areaName: 'Quality Inspection Center', produced: 800, scrap: 2 },
    { id: 'e1111111-0007-1111-1111-111111111111', name: 'Assembly Station 01', description: 'Assembly Station 01', code: 'ASM-01', workCenter: 'WC-ASM', equipmentType: 'ASSEMBLY', status: 'RUNNING', lineName: 'Automotive Assembly Line 1', areaName: 'Assembly Work Center', produced: 400, scrap: 1 },
    { id: 'e1111111-0008-1111-1111-111111111111', name: 'Functional Torque & Load Test Bench 01', description: 'Functional Torque & Load Test Bench 01', code: 'TEST-01', workCenter: 'WC-TEST', equipmentType: 'TESTING', status: 'RUNNING', lineName: 'Automotive Assembly Line 1', areaName: 'Testing Work Center', produced: 500, scrap: 0 },
    { id: 'e1111111-0009-1111-1111-111111111111', name: 'Coordinate Measuring Machine 01', description: 'Coordinate Measuring Machine 01', code: 'QC-02', workCenter: 'WC-QC', equipmentType: 'METROLOGY', status: 'RUNNING', lineName: 'Automotive Assembly Line 1', areaName: 'Quality Inspection Center', produced: 350, scrap: 0 },
  ];

  const machines = dbMachines.length > 0 ? dbMachines : defaultMachines;

  const handleStatusChange = async (machineId: string, status: any) => {
    updateLiveMachineState(machineId, status);
    try {
      await fetch(getApiUrl(`/plants/machines/${machineId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      fetchEquipment();
    } catch (e) {
      console.warn('Failed to update machine status on server:', e);
    }
  };

  const handleCardClick = (machineCode: string) => {
    navigate(`/equipment?code=${encodeURIComponent(machineCode)}`);
  };

  const statusColors = {
    RUNNING: 'border-l-4 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    IDLE: 'border-l-4 border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    BREAKDOWN: 'border-l-4 border-red-500 bg-red-500/5 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    SETUP: 'border-l-4 border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    MAINTENANCE: 'border-l-4 border-purple-500 bg-purple-500/5 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  const statusIndicators = {
    RUNNING: 'bg-emerald-500 glow-running',
    IDLE: 'bg-amber-500 glow-idle',
    BREAKDOWN: 'bg-red-500 glow-breakdown',
    SETUP: 'bg-blue-500',
    MAINTENANCE: 'bg-purple-500',
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header with Live Sync Controls & Status Legends */}
      <div className="flex flex-col gap-3 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="text-blue-500" size={20} /> Shopfloor Production Monitoring
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time asset telemetry, live machine states, cycle logs, and operational controls
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Dynamic Live Sync (3s)
            </div>
            <button
              onClick={() => { setLoading(true); fetchEquipment().finally(() => setLoading(false)); }}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Refresh Asset Fleet Now"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Legends Bar */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-100/80 dark:bg-slate-900/60 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1 pr-2 border-r border-slate-300 dark:border-slate-700">
            Status Legends:
          </span>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400"
            title="Running (Green): Machine is actively running & producing batches"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span>Running</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400"
            title="Idle / Standby (Amber): Machine is powered on & ready, waiting for batch feed or start"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            <span>Idle / Standby</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/25 rounded-lg text-xs font-bold text-red-600 dark:text-red-400"
            title="Breakdown / Stoppage (Red): Machine error, fault alarm, or emergency stop"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
            <span>Breakdown / Fault</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/25 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400"
            title="Setup / Changeover (Blue): Tooling adjustment, product changeover, or CIP cleaning"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
            <span>Setup / Changeover</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/25 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400"
            title="Maintenance / Calibration (Purple): Calibration due, qualification testing, or maintenance"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span>
            <span>Maintenance / Calibration</span>
          </div>
        </div>
      </div>

      {/* Dynamic Equipment Layout Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {machines.map((machine) => {
          const status = liveMachineStatuses[machine.id] || machine.status || 'IDLE';
          const oee = liveMachineOEE[machine.id] !== undefined ? liveMachineOEE[machine.id] : getDefaultOee(status, machine.code);
          const good = liveGoodCounts[machine.id] !== undefined ? liveGoodCounts[machine.id] : (machine.produced || 0);
          const scrap = liveScrapCounts[machine.id] !== undefined ? liveScrapCounts[machine.id] : (machine.scrap || 0);
          const isSelected = selectedMachine === machine.id;
          const assetDescription = machine.description || (machine.name ? machine.name.replace(/\s*\([^)]*\)/g, '').trim() : 'Equipment Asset');

          return (
            <div
              key={machine.id}
              onClick={() => handleCardClick(machine.code)}
              title={`Click to view Equipment & Calibration records for ${machine.code}`}
              className={`industrial-card p-3.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg rounded-xl relative group ${statusColors[status]} ${
                isSelected ? 'ring-2 ring-blue-500 border-transparent shadow-blue-500/15' : 'hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="text-left overflow-hidden pr-1">
                  {/* Dynamic Asset Description */}
                  <span
                    className="text-[11px] uppercase font-extrabold tracking-wider text-blue-600 dark:text-blue-400 block truncate"
                    title={assetDescription}
                  >
                    {assetDescription}
                  </span>
                  {/* Asset Code */}
                  <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5 tracking-tight group-hover:text-blue-500 transition">
                    {machine.code}
                  </span>
                  {/* Production Line Subtitle */}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block truncate mt-0.5">
                    {machine.workCenter ? `${machine.workCenter} • ` : ''}{machine.lineName && machine.lineName !== 'N/A' ? machine.lineName : (machine.areaName || 'Main Plant')}
                  </span>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 ${statusIndicators[status]}`}
                  title={`Operational State: ${status}`}
                ></div>
              </div>

              <div className="space-y-2 pt-2.5 border-t border-slate-200 dark:border-slate-700/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">OEE:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{oee}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Produced:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{good.toLocaleString()} pcs</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Scrap:</span>
                  <span className="font-bold text-rose-500">{scrap.toLocaleString()} pcs</span>
                </div>
              </div>

              {/* Direct Navigation Footer Indicator */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-700/50 text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-500 transition">
                <span className="flex items-center gap-1">
                  <ExternalLink size={10} /> View Calibrations
                </span>
                <ArrowRight size={12} className="transform group-hover:translate-x-1 transition duration-200" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Machine Control Center */}
      {selectedMachine ? (
        (() => {
          const machine = machines.find(m => m.id === selectedMachine);
          if (!machine) return null;
          const currentStatus = liveMachineStatuses[machine.id] || machine.status || 'IDLE';
          const assetDescription = machine.description || (machine.name ? machine.name.replace(/\s*\([^)]*\)/g, '').trim() : 'Equipment Asset');

          return (
            <div className="industrial-card p-6 space-y-5 rounded-2xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                    <Cpu size={24} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{assetDescription}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-mono font-bold">
                        {machine.code}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Work Center: <strong>{machine.workCenter || 'WC-GEN'}</strong> • Type: <strong>{machine.equipmentType || 'EQUIPMENT'}</strong> • Capacity: <strong>{Number(machine.capacityPerShift || 500).toLocaleString()} pcs/shift</strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Active State:</span>
                  <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase tracking-wider dark:text-white border dark:border-slate-700">
                    {currentStatus}
                  </span>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="space-y-3 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational State Overrides</h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => handleStatusChange(machine.id, 'RUNNING')}
                    disabled={currentStatus === 'RUNNING'}
                    className="flex items-center gap-2 bg-[#174A7C] hover:bg-[#142A45] disabled:opacity-50 text-white font-medium py-2 px-3.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                  >
                    <Play size={14} /> Start Machine (Running)
                  </button>
                  <button
                    onClick={() => handleStatusChange(machine.id, 'IDLE')}
                    disabled={currentStatus === 'IDLE'}
                    className="flex items-center gap-2 bg-[#142A45] hover:bg-[#102237] disabled:opacity-50 text-white border border-[#1F3A5C] font-medium py-2 px-3.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                  >
                    <Square size={14} className="text-[#F5A623]" /> Standby (Idle)
                  </button>
                  <button
                    onClick={() => handleStatusChange(machine.id, 'BREAKDOWN')}
                    disabled={currentStatus === 'BREAKDOWN'}
                    className="flex items-center gap-2 bg-[#142A45] hover:bg-[#102237] disabled:opacity-50 text-slate-200 border border-slate-700 font-medium py-2 px-3.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                  >
                    <ShieldAlert size={14} className="text-slate-300" /> Report Fault (Breakdown)
                  </button>
                  <button
                    onClick={() => handleStatusChange(machine.id, 'SETUP')}
                    disabled={currentStatus === 'SETUP'}
                    className="flex items-center gap-2 bg-[#174A7C] hover:bg-[#142A45] disabled:opacity-50 text-white font-medium py-2 px-3.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                  >
                    <Settings size={14} /> Changeover / Setup
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="p-6 border border-dashed border-slate-300 dark:border-slate-700/80 rounded-xl text-center text-slate-400 text-xs font-medium">
          Select any machine tile above to access real-time operational override controls
        </div>
      )}
    </div>
  );
}
