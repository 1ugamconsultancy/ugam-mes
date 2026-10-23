import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getApiUrl } from '../config';
import {
  Wrench,
  Calendar,
  ShieldCheck,
  Activity,
  Plus,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  Cpu,
  Clock,
  ExternalLink,
  Filter,
  Play,
  Pause,
  AlertOctagon,
  X,
  Save
} from 'lucide-react';

interface EquipmentStatus {
  id: string;
  name: string;
  code: string;
  workCenter?: string;
  equipmentType?: string;
  manufacturer?: string;
  model?: string;
  capacityPerShift?: number;
  oeeApplicable?: string;
  lineName: string;
  areaName: string;
  status: string;
  produced?: number;
  scrap?: number;
  complianceStatus: 'Qualified' | 'Calibration Due' | 'Cleaning Due' | 'Under Maintenance';
  nextCalibrationDue: string;
  qualificationType: string;
}

export interface MasterEquipmentItem {
  equipmentId: string;
  equipmentName: string;
  workCenter: string;
  equipmentType: string;
  manufacturer: string;
  model: string;
  capacityPerShift: number;
  oeeApplicable: string;
  status: string;
}

const FALLBACK_MASTER_EQUIPMENT: MasterEquipmentItem[] = [
  { equipmentId: 'CUT-01', equipmentName: 'Automatic Bar Cutter 01', workCenter: 'WC-CUT', equipmentType: 'CUTTING', manufacturer: 'OEM-A', model: 'ABC-250', capacityPerShift: 1200, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'CNC-01', equipmentName: 'CNC Turning Center 01', workCenter: 'WC-CNC', equipmentType: 'CNC_LATHE', manufacturer: 'OEM-B', model: 'CT-500', capacityPerShift: 500, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'DBR-01', equipmentName: 'Deburring Machine 01', workCenter: 'WC-DBR', equipmentType: 'DEBURRING', manufacturer: 'OEM-C', model: 'DB-100', capacityPerShift: 1000, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'HT-01', equipmentName: 'Heat Treatment Furnace 01', workCenter: 'WC-HT', equipmentType: 'FURNACE', manufacturer: 'OEM-D', model: 'HTF-1000', capacityPerShift: 300, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'RM-01', equipmentName: 'Rubber Moulding Machine 01', workCenter: 'WC-RM', equipmentType: 'PRESS', manufacturer: 'OEM-E', model: 'RM-250', capacityPerShift: 600, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'ASM-01', equipmentName: 'Assembly Station 01', workCenter: 'WC-ASM', equipmentType: 'ASSEMBLY', manufacturer: 'INTERNAL', model: 'ASM-01', capacityPerShift: 400, oeeApplicable: 'Y', status: 'RUNNING' },
];

interface Calibration {
  id: string;
  machine: { name: string; code: string };
  calibrationDate: string;
  nextCalibrationDue: string;
  calibratedBy: string;
  certificateNumber: string;
  status: string;
}

interface Qualification {
  id: string;
  machine: { name: string; code: string };
  qualificationType: 'IQ' | 'OQ' | 'PQ';
  qualificationDate: string;
  expiryDate: string | null;
  performedBy: string;
  status: string;
  notes: string;
}

export default function Equipment() {
  const { token, user, updateLiveMachineState, addAlert } = useShopfloorStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetCode = searchParams.get('code') || searchParams.get('machine');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'calibrations' | 'qualifications' | 'checklist'>('dashboard');
  const [focusedCode, setFocusedCode] = useState<string | null>(null);

  // Lists
  const [equipments, setEquipments] = useState<EquipmentStatus[]>([]);
  const [masterList, setMasterList] = useState<MasterEquipmentItem[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync focused code from URL search param
  useEffect(() => {
    if (targetCode) {
      const upper = targetCode.toUpperCase();
      setFocusedCode(upper);
      setActiveTab('dashboard');
    }
  }, [targetCode]);

  // Calibration Form
  const [showCalModal, setShowCalModal] = useState(false);
  const [calMachineId, setCalMachineId] = useState('');
  const [calDate, setCalDate] = useState('');
  const [calDue, setCalDue] = useState('');
  const [calBy, setCalBy] = useState('Apex Metrology Calibration Inc.');
  const [calCert, setCalCert] = useState('');

  // Qualification Form
  const [showQualModal, setShowQualModal] = useState(false);
  const [qualMachineId, setQualMachineId] = useState('');
  const [qualType, setQualType] = useState<'IQ' | 'OQ' | 'PQ'>('PQ');
  const [qualDate, setQualDate] = useState('');
  const [qualExpiry, setQualExpiry] = useState('');
  const [qualBy, setQualBy] = useState('Dr. Robert Chen');
  const [qualNotes, setQualNotes] = useState('');

  // Checklist Simulator
  const [scaleChecked, setScaleChecked] = useState(false);
  const [pressChecked, setPressChecked] = useState(false);
  const [dryerChecked, setDryerChecked] = useState(false);
  const [calPassed, setCalPassed] = useState<boolean | null>(null);

  // Machine Controls & Breakdown Logging
  const [breakdownModalEq, setBreakdownModalEq] = useState<EquipmentStatus | null>(null);
  const [breakdownReason, setBreakdownReason] = useState('MECHANICAL_JAM');
  const [breakdownStartTime, setBreakdownStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [breakdownDuration, setBreakdownDuration] = useState('30');
  const [breakdownSeverity, setBreakdownSeverity] = useState<'MINOR' | 'MAJOR' | 'CRITICAL'>('MAJOR');
  const [breakdownNotes, setBreakdownNotes] = useState('');
  const [loggingBreakdown, setLoggingBreakdown] = useState(false);
  const [breakdownBanner, setBreakdownBanner] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [eqRes, calRes, qualRes, masterRes] = await Promise.all([
        fetch(getApiUrl('/equipment/status'), { headers }),
        fetch(getApiUrl('/equipment/calibrations'), { headers }),
        fetch(getApiUrl('/equipment/qualifications'), { headers }),
        fetch(getApiUrl('/equipment/master'), { headers }).catch(() => null),
      ]);

      if (eqRes.ok) {
        const eqData = await eqRes.json();
        setEquipments(eqData);
        if (eqData.length > 0) {
          const match = targetCode ? eqData.find((m: any) => m.code?.toUpperCase() === targetCode.toUpperCase()) : null;
          const defaultId = match ? match.id : eqData[0].id;
          setCalMachineId(defaultId);
          setQualMachineId(defaultId);
        }
      }
      if (calRes.ok) setCalibrations(await calRes.json());
      if (qualRes.ok) setQualifications(await qualRes.json());
      if (masterRes && masterRes.ok) {
        const mData = await masterRes.json();
        if (Array.isArray(mData)) setMasterList(mData);
      }
    } catch (err) {
      console.error('Error loading equipment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Scroll to focused equipment row once equipments data is ready
  useEffect(() => {
    if (focusedCode && equipments.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`eq-row-${focusedCode}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [focusedCode, equipments]);

  const handleLogCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl('/equipment/calibrations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          machineId: calMachineId,
          calibrationDate: new Date(calDate).toISOString(),
          nextCalibrationDue: new Date(calDue).toISOString(),
          calibratedBy: calBy,
          certificateNumber: calCert,
          status: 'PASSED'
        })
      });
      if (response.ok) {
        setShowCalModal(false);
        setCalCert('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl('/equipment/qualifications'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          machineId: qualMachineId,
          qualificationType: qualType,
          qualificationDate: new Date(qualDate).toISOString(),
          expiryDate: qualExpiry ? new Date(qualExpiry).toISOString() : null,
          performedBy: qualBy,
          status: 'COMPLETED',
          notes: qualNotes
        })
      });
      if (response.ok) {
        setShowQualModal(false);
        setQualNotes('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStartPause = async (eq: EquipmentStatus) => {
    const isRunning = eq.status === 'RUNNING';
    const newStatus: 'RUNNING' | 'IDLE' = isRunning ? 'IDLE' : 'RUNNING';

    // Optimistically update local state
    setEquipments(prev => prev.map(item => item.id === eq.id || item.code === eq.code ? { 
      ...item, 
      status: newStatus,
      complianceStatus: newStatus === 'RUNNING' && item.complianceStatus === 'Under Maintenance' ? 'Qualified' : item.complianceStatus
    } : item));
    setMasterList(prev => prev.map(m => m.equipmentId === eq.code ? { ...m, status: newStatus } : m));
    updateLiveMachineState(eq.id, newStatus);

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      await fetch(getApiUrl(`/plants/machines/${eq.id}/status`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      await fetch(getApiUrl(`/equipment/master/${eq.code}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      }).catch(() => null);
    } catch (err) {
      console.warn('Failed to sync machine status to backend:', err);
    }
  };

  const handleLogBreakdownSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakdownModalEq) return;
    setLoggingBreakdown(true);
    const eq = breakdownModalEq;

    // Optimistically update local state to BREAKDOWN and Under Maintenance
    setEquipments(prev => prev.map(item => item.id === eq.id || item.code === eq.code ? { 
      ...item, 
      status: 'BREAKDOWN',
      complianceStatus: 'Under Maintenance'
    } : item));
    setMasterList(prev => prev.map(m => m.equipmentId === eq.code ? { ...m, status: 'BREAKDOWN' } : m));
    updateLiveMachineState(eq.id, 'BREAKDOWN');

    // Push alert notification to global shopfloor store
    addAlert({
      title: `Breakdown Reported: ${eq.name} (${eq.code})`,
      message: `${breakdownReason.replace(/_/g, ' ')} • Expected downtime: ${breakdownDuration} mins. Notes: ${breakdownNotes || 'None'}`,
      severity: breakdownSeverity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      timestamp: new Date(),
      link: `/equipment?code=${eq.code}`
    });

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      await fetch(getApiUrl(`/plants/machines/${eq.id}/status`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'BREAKDOWN' })
      });
      await fetch(getApiUrl(`/equipment/master/${eq.code}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'BREAKDOWN' })
      }).catch(() => null);
    } catch (err) {
      console.warn('Failed to sync breakdown status to backend:', err);
    } finally {
      setLoggingBreakdown(false);
      setBreakdownBanner(`Downtime fault reported for ${eq.name} (${eq.code}). Machine halted and maintenance dispatched.`);
      setTimeout(() => setBreakdownBanner(null), 6000);
      setBreakdownModalEq(null);
      setBreakdownNotes('');
    }
  };

  const getComplianceStatusBadge = (status: EquipmentStatus['complianceStatus']) => {
    switch (status) {
      case 'Qualified':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'Calibration Due':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'Cleaning Due':
        return 'bg-blue-500/10 text-blue-500 border border-blue-550/20 animate-pulse';
      case 'Under Maintenance':
        return 'bg-purple-500/10 text-purple-500 border border-purple-550/20';
      default:
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-2.5 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col justify-start items-start text-left">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">Equipment Calibration & Qualification</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track validation statuses (IQ/OQ/PQ), log preventative maintenance runs, and manage instrument certifications.
          </p>
        </div>
      </div>

      {/* Interactive Segmented Button Cards / Pills Bar */}
      <div className="bg-slate-100 dark:bg-[#102237] p-1.5 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex flex-wrap items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'dashboard'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Cpu size={15} className={activeTab === 'dashboard' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Asset Dashboard</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'dashboard'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {equipments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'master'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <FileCheck size={15} className={activeTab === 'master' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Machine Master Catalog</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'master'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {masterList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calibrations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'calibrations'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Calendar size={15} className={activeTab === 'calibrations' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Calibration Certificates</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'calibrations'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {calibrations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qualifications')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'qualifications'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <ShieldCheck size={15} className={activeTab === 'qualifications' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Validation Records (IQ/OQ/PQ)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'qualifications'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {qualifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'checklist'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Wrench size={15} className={activeTab === 'checklist' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>GMP Calibration Checklist</span>
        </button>
      </div>

      {/* Tab contents */}
      {activeTab === 'dashboard' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 p-5 rounded-xl flex items-center justify-between shadow">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">Qualified Assets</span>
                <span className="text-base font-extrabold block text-slate-800 dark:text-white">
                  {equipments.filter(e => e.complianceStatus === 'Qualified').length}
                </span>
              </div>
              <CheckCircle size={32} className="text-emerald-500" />
            </div>

            <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 p-5 rounded-xl flex items-center justify-between shadow">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">Calibration Overdue</span>
                <span className="text-base font-extrabold block text-slate-800 dark:text-white text-rose-500">
                  {equipments.filter(e => e.complianceStatus === 'Calibration Due').length}
                </span>
              </div>
              <AlertTriangle size={32} className="text-rose-500 animate-bounce" />
            </div>

            <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 p-5 rounded-xl flex items-center justify-between shadow">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">Cleaning Needed</span>
                <span className="text-base font-extrabold block text-slate-800 dark:text-white text-blue-500">
                  {equipments.filter(e => e.complianceStatus === 'Cleaning Due').length}
                </span>
              </div>
              <Clock size={32} className="text-blue-500" />
            </div>

            <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 p-5 rounded-xl flex items-center justify-between shadow">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">Maintenance Halt</span>
                <span className="text-base font-extrabold block text-slate-800 dark:text-white text-purple-500">
                  {equipments.filter(e => e.complianceStatus === 'Under Maintenance').length}
                </span>
              </div>
              <Wrench size={32} className="text-purple-500" />
            </div>
          </div>

          {/* Focused Asset Filter Banner */}
          {focusedCode && (
            <div className="flex items-center justify-between p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Cpu size={16} />
                </div>
                <div>
                  <span className="font-semibold block">Focused Equipment Asset: <strong className="font-mono text-sm underline">{focusedCode}</strong></span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Navigated from Production Monitoring. Viewing calibration and qualification logs.</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setFocusedCode(null);
                  setSearchParams({});
                }}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Show All Equipment
              </button>
            </div>
          )}

          {/* Breakdown Alert Banner */}
          {breakdownBanner && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertOctagon size={16} className="text-rose-500" />
                <span>{breakdownBanner}</span>
              </div>
              <button onClick={() => setBreakdownBanner(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-md rounded-xl overflow-hidden">
            <div className="p-3 border-b dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-300 uppercase">Manufacturing & Processing Assets Register</span>
              <span className="font-semibold text-slate-400">Classified by clean room & processing lines</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3">Asset Code</th>
                  <th className="p-3">Asset Name</th>
                  <th className="p-3">Work Center & Type</th>
                  <th className="p-3">OEM & Model</th>
                  <th className="p-3">Location & Line</th>
                  <th className="p-3">Validation Status</th>
                  <th className="p-3">Calibration Expiry</th>
                  <th className="p-3">Compliance State</th>
                  <th className="p-3">Machine Controls & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {equipments.map((eq) => {
                  const isFocused = focusedCode && eq.code?.toUpperCase() === focusedCode.toUpperCase();
                  const isMachineRunning = eq.status === 'RUNNING';
                  const isUnderBreakdown = eq.status === 'BREAKDOWN' || eq.complianceStatus === 'Under Maintenance';
                  return (
                    <tr
                      key={eq.id}
                      id={`eq-row-${eq.code}`}
                      className={`transition duration-200 ${
                        isFocused
                          ? 'bg-blue-500/15 dark:bg-blue-900/40 ring-2 ring-blue-500 border-l-4 border-l-blue-600 dark:border-l-blue-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {eq.code}
                        {isFocused && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse">
                            Selected
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{eq.name}</td>
                      <td className="p-3 text-xs">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {eq.workCenter ?? 'Unavailable'}
                        </span>
                        <span className="block mt-0.5 text-[11px] text-slate-400 font-medium">
                          {eq.equipmentType ?? 'Unavailable'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{eq.manufacturer ?? 'Unavailable'}</span>
                        <span className="block mt-0.5 font-mono text-[10px]">{eq.model ?? 'Unavailable'}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-400">
                        <span>Area: <strong>{eq.areaName}</strong></span>
                        <span className="block mt-0.5">Line: {eq.lineName}</span>
                      </td>
                      <td className="p-3 font-semibold">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-450 border border-blue-550/20">
                          {eq.qualificationType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-400">
                        {eq.nextCalibrationDue === 'EXPIRED' ? (
                          <span className="text-rose-500 font-bold">CALIBRATION EXPIRED</span>
                        ) : (
                          eq.nextCalibrationDue ? new Date(eq.nextCalibrationDue).toLocaleDateString() : 'Unavailable'
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${getComplianceStatusBadge(eq.complianceStatus)}`}>
                          {eq.complianceStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStartPause(eq)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer ${
                              isMachineRunning
                                ? 'bg-[#142A45] hover:bg-[#102237] text-white border border-[#1F3A5C]'
                                : 'bg-[#174A7C] hover:bg-[#142A45] text-white'
                            }`}
                          >
                            {isMachineRunning ? (
                              <>
                                <Pause size={13} className="fill-current text-[#F5A623]" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play size={13} className="fill-current text-white" />
                                <span>Start</span>
                              </>
                            )}
                          </button>

                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => {
                                setBreakdownModalEq(eq);
                                setBreakdownStartTime(new Date().toISOString().slice(0, 16));
                              }}
                              title={`Report Downtime / Fault for ${eq.code}`}
                              className={`p-1.5 rounded-lg transition active:scale-95 cursor-pointer flex items-center justify-center ${
                                isUnderBreakdown
                                  ? 'bg-[#142A45] text-rose-400 border border-rose-500/50 shadow-sm'
                                  : 'bg-slate-100 dark:bg-[#142A45] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-[#102237]'
                              }`}
                            >
                              <AlertOctagon size={16} />
                            </button>

                            {/* Styled Tooltip matching user screenshot */}
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30 whitespace-nowrap">
                              <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg border border-slate-300 dark:border-slate-700">
                                Report Downtime / Fault for {eq.code}
                              </div>
                              <div className="w-2 h-2 bg-white dark:bg-slate-900 border-r border-b border-slate-300 dark:border-slate-700 transform rotate-45 -mt-1 mr-4" />
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Machine Master Tab - Matching Media Spreadsheet Specifications */}
      {activeTab === 'master' && (
        <div className="space-y-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 p-4 rounded-xl shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="text-blue-500" size={18} /> Master Machinery & Technical Specifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official Machine Master definitions from engineering blueprints and line layout specifications.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 rounded-lg text-xs font-bold">
                {masterList.filter(m => m.status === 'RUNNING').length} of {masterList.length} Online
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-md rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3">Machine_ID</th>
                  <th className="p-3">Machine_Name</th>
                  <th className="p-3">Work_Center</th>
                  <th className="p-3">Machine_Type</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3">Model</th>
                  <th className="p-3 text-right">Capacity_Per_Shift</th>
                  <th className="p-3 text-center">OEE_Applicable</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Quick Navigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-xs text-slate-800 dark:text-slate-200">
                {masterList.map((m) => (
                  <tr key={m.equipmentId} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {m.equipmentId}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {m.equipmentName}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {m.workCenter}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {m.equipmentType}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{m.manufacturer}</td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{m.model}</td>
                    <td className="p-3 font-mono font-bold text-right">
                      {m.capacityPerShift == null ? 'Unavailable' : Number(m.capacityPerShift).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">pcs</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {m.oeeApplicable}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setFocusedCode(m.equipmentId);
                          setActiveTab('dashboard');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:hover:text-white rounded text-[11px] font-bold transition inline-flex items-center gap-1"
                      >
                        <ExternalLink size={11} /> View Asset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'calibrations' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">NIST Traceable Calibration Logs</h3>
            {user?.role !== 'OPERATOR' && (
              <button
                onClick={() => setShowCalModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
              >
                <Plus size={14} /> Add Calibration Log
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3">Cert Number</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Calibration Date</th>
                  <th className="p-3">Next Due Date</th>
                  <th className="p-3">Certified By</th>
                  <th className="p-3">Calibration Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {calibrations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-blue-500 text-xs">{c.certificateNumber}</td>
                    <td className="p-3">
                      <span className="font-bold block">{c.machine?.code}</span>
                      <span className="text-xs text-slate-400">{c.machine?.name}</span>
                    </td>
                    <td className="p-3 font-mono text-xs">{new Date(c.calibrationDate).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-xs">{new Date(c.nextCalibrationDue).toLocaleDateString()}</td>
                    <td className="p-3 text-xs text-slate-400">{c.calibratedBy}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showCalModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white">Add Equipment Calibration Log</h3>
                  <button
                    type="button"
                    onClick={() => setShowCalModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleLogCalibration} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Equipment / Machine</label>
                    <select
                      value={calMachineId} onChange={(e) => setCalMachineId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    >
                      {equipments.map(e => (
                        <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Calibration Date</label>
                      <input
                        type="date" required value={calDate} onChange={(e) => setCalDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Next Due Date</label>
                      <input
                        type="date" required value={calDue} onChange={(e) => setCalDue(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Calibration Partner</label>
                    <input
                      type="text" required value={calBy} onChange={(e) => setCalBy(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Certificate Number</label>
                    <input
                      type="text" required value={calCert} onChange={(e) => setCalCert(e.target.value)} placeholder="e.g. CAL-TCP-0118"
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowCalModal(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Save Calibration</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'qualifications' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Validation Protocol Logs (IQ / OQ / PQ)</h3>
            {user?.role !== 'OPERATOR' && (
              <button
                onClick={() => setShowQualModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
              >
                <Plus size={14} /> Add Validation Record
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3">Validation Type</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Execution Date</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Authorized Auditor</th>
                  <th className="p-3 font-medium">Auditor Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {qualifications.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 text-blue-450 border border-blue-550/25">
                        {q.qualificationType} PROTOCOL
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold block">{q.machine?.code}</span>
                      <span className="text-xs text-slate-400">{q.machine?.name}</span>
                    </td>
                    <td className="p-3 font-mono text-xs">{new Date(q.qualificationDate).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-xs text-slate-400">
                      {q.expiryDate ? new Date(q.expiryDate).toLocaleDateString() : 'N/A (Indefinite)'}
                    </td>
                    <td className="p-3 text-xs font-semibold">{q.performedBy}</td>
                    <td className="p-3 text-xs text-slate-400">{q.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showQualModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white">Add Validation Qualification Protocol</h3>
                  <button
                    type="button"
                    onClick={() => setShowQualModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleLogQualification} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Equipment / Machine</label>
                    <select
                      value={qualMachineId} onChange={(e) => setQualMachineId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    >
                      {equipments.map(e => (
                        <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Protocol Type</label>
                      <select
                        value={qualType} onChange={(e) => setQualType(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white text-slate-800"
                      >
                        <option value="IQ">IQ (Installation)</option>
                        <option value="OQ">OQ (Operational)</option>
                        <option value="PQ">PQ (Performance)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Auditor Agent</label>
                      <input
                        type="text" required value={qualBy} onChange={(e) => setQualBy(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Execution Date</label>
                      <input
                        type="date" required value={qualDate} onChange={(e) => setQualDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Expiry Date (PQ only)</label>
                      <input
                        type="date" value={qualExpiry} onChange={(e) => setQualExpiry(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Audit Protocol Comments</label>
                    <textarea
                      rows={2} value={qualNotes} onChange={(e) => setQualNotes(e.target.value)} placeholder="Compliance notes..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowQualModal(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Log Protocol</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl p-3 lg:col-span-2 space-y-6">
            <div className="pb-4 border-b dark:border-slate-700/80">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Verification scale & former Calibration checklists</h3>
              <p className="text-xs text-slate-400">Perform local daily calibrations in accordance with standard operating procedures (SOP-082).</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl text-left">
                <input
                  type="checkbox" checked={scaleChecked} onChange={(e) => setScaleChecked(e.target.checked)} id="scale"
                  className="mt-1 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="scale" className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Coordinate Measuring Machine CMM (QC-02) Probe Calibration Check
                  </label>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Verify standard ruby probe reference sphere (Ø25.000 mm ± 0.001 mm) on CMM QC-02. Confirm spatial repeatability drift remains &lt; 0.5 µm.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl text-left">
                <input
                  type="checkbox" checked={pressChecked} onChange={(e) => setPressChecked(e.target.checked)} id="press"
                  className="mt-1 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="press" className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    CNC Turning Center (CNC-01) Tool Preset & Chuck Runout Verification
                  </label>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Examine hydraulic chuck clamping pressure (25 bar). Verify CNC turning tool offset preset against master calibration test bar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl text-left">
                <input
                  type="checkbox" checked={dryerChecked} onChange={(e) => setDryerChecked(e.target.checked)} id="dryer"
                  className="mt-1 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="dryer" className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Automatic Bar Cutter (CUT-01) Blade Tension & Feed Stop Calibration
                  </label>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Check bi-metal band saw blade hydraulic tension (2800 PSI). Verify pneumatic length stop linear sensor alignment (± 0.05 mm).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t dark:border-slate-700/80 flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-300 font-bold">
                {scaleChecked && pressChecked && dryerChecked ? 'All parameters checked' : 'Checklists incomplete'}
              </span>
              <button
                disabled={!scaleChecked || !pressChecked || !dryerChecked}
                onClick={() => setCalPassed(true)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 dark:text-slate-300 text-white rounded text-xs font-bold transition shadow cursor-pointer active:scale-95"
              >
                Certify Production Line State
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl p-3 space-y-4 text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck size={18} className="text-emerald-500" /> Checklist Status Logs
            </h3>
            {calPassed && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-550/20 text-emerald-450 rounded-xl text-xs space-y-2">
                <span className="font-bold uppercase tracking-wider block">GAMP 5 COMPLIANT APPROVAL</span>
                <p>All production tools and scales verified by logged operator session.</p>
              </div>
            )}
            <p className="text-xs text-slate-400 leading-relaxed">
              Before kicking off a production batch, compliance engineers must execute validation procedures. 
              The MES will trace these checks directly inside the EBR dossier.
            </p>
          </div>
        </div>
      )}

      {/* Report Equipment Breakdown / Downtime Modal */}
      {breakdownModalEq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-left space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Report Downtime / Breakdown</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {breakdownModalEq.name} ({breakdownModalEq.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBreakdownModalEq(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogBreakdownSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Breakdown / Fault Category *</label>
                <select
                  value={breakdownReason}
                  onChange={(e) => setBreakdownReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-semibold"
                >
                  <option value="MECHANICAL_JAM">Mechanical Jam (Spindle, Infeed, Cutter Blade)</option>
                  <option value="ELECTRICAL_TRIP">Electrical Trip / Motor Overload</option>
                  <option value="TOOL_WEAR">Excessive Tool / Blade Wear or Breakage</option>
                  <option value="OVERHEAT_FAULT">Thermal / Pyrometer Overheat Excursion</option>
                  <option value="HYDRAULIC_PRESSURE_DROP">Hydraulic Leak / Pressure Drop (&lt; 20 bar)</option>
                  <option value="EMERGENCY_ESTOP">Emergency E-Stop Tripped / Safety Interlock</option>
                  <option value="UNSCHEDULED_MAINTENANCE">Unscheduled Emergency Maintenance</option>
                  <option value="SENSOR_CALIBRATION_FAULT">Sensor Drift / Calibration Anomaly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Breakdown Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={breakdownStartTime}
                    onChange={(e) => setBreakdownStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Est. Duration (Minutes) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={breakdownDuration}
                    onChange={(e) => setBreakdownDuration(e.target.value)}
                    placeholder="30"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Fault Severity *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'MINOR', label: 'Minor Fault', desc: 'Degraded Speed' },
                    { id: 'MAJOR', label: 'Major Breakdown', desc: 'Machine Halted' },
                    { id: 'CRITICAL', label: 'Critical Line Stop', desc: 'Full Line Interlock' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setBreakdownSeverity(s.id as any)}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                        breakdownSeverity === s.id
                          ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{s.label}</div>
                      <div className="text-[9px] text-slate-400">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Operator Notes & Corrective Actions</label>
                <textarea
                  rows={3}
                  value={breakdownNotes}
                  onChange={(e) => setBreakdownNotes(e.target.value)}
                  placeholder="Describe alarm codes, symptoms, visual inspection findings..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBreakdownModalEq(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loggingBreakdown}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <AlertOctagon size={14} />
                  <span>{loggingBreakdown ? 'Logging...' : 'Log Breakdown & Halt Machine'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
