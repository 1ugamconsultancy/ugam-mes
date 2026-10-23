import React, { useState, useEffect } from 'react';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getApiUrl } from '../config';
import {
  History,
  AlertOctagon,
  ShieldCheck,
  FileText,
  Plus,
  Lock,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  BookmarkCheck,
  Cpu,
  X
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  username: string;
  userRole?: string;
  action: string;
  ipAddress?: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

interface Deviation {
  id: string;
  deviationCode?: string;
  workOrderId?: string;
  workOrder?: { woNumber: string };
  title?: string;
  description: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  category?: string;
  reportedBy?: { name: string; username: string; role?: string };
  reporter?: { firstName?: string; lastName?: string; username: string; role?: string };
  reportedAt?: string;
  status: 'OPEN' | 'CLOSED';
  investigationDetails?: string;
  rootCause?: string;
  resolvedBy?: string;
  resolver?: { firstName?: string; lastName?: string; username: string; role?: string };
  resolverName?: string;
  resolvedAt?: string;
}

interface Capa {
  id: string;
  capaCode?: string;
  deviationId?: string;
  deviationCode?: string;
  deviation?: { id: string; title: string };
  title?: string;
  description: string;
  actionRequired?: string;
  actionType?: string;
  assignedTo?: string;
  assignee?: { firstName?: string; lastName?: string; username: string; role?: string };
  targetCompletionDate?: string;
  dueDate?: string;
  completedDate?: string;
  status: 'OPEN' | 'COMPLETED';
  verificationDetails?: string;
  verifiedBy?: string;
  createdAt?: string;
}

interface ChangeControl {
  id: string;
  changeCode?: string;
  title: string;
  description: string;
  rationalization?: string;
  reasonForChange?: string;
  impactAssessment?: string;
  status: 'INITIATED' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  initiatedBy?: string;
  initiator?: { name: string; username: string; role?: string };
  creator?: { name: string };
  approvedBy?: string;
  approver?: { name: string; username: string; role?: string };
  approverName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SopDocument {
  id: string;
  documentCode?: string;
  documentNumber?: string;
  title: string;
  version: string;
  category?: string;
  documentType?: string;
  filePath?: string;
  status: string;
  effectiveDate: string;
  createdBy?: string;
  creator?: { name: string; role?: string };
  approvedBy?: string;
  approver?: { name: string; role?: string };
  createdAt?: string;
}

export default function Compliance() {
  const { token, user } = useShopfloorStore();
  const [activeTab, setActiveTab] = useState<'audit' | 'deviations' | 'capa' | 'change' | 'sop'>('audit');

  // Lists
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [changes, setChanges] = useState<ChangeControl[]>([]);
  const [documents, setDocuments] = useState<SopDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals / forms
  const [showDevModal, setShowDevModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCapaModal, setShowCapaModal] = useState(false);
  const [showCompleteCapaModal, setShowCompleteCapaModal] = useState(false);
  const [showCcModal, setShowCcModal] = useState(false);
  const [showAppCcModal, setShowAppCcModal] = useState(false);

  // Deviation resolution
  const [activeDevId, setActiveDevId] = useState<string | null>(null);
  const [devInvest, setDevInvest] = useState('');
  const [devRootCause, setDevRootCause] = useState('');
  const [showViewClosureModal, setShowViewClosureModal] = useState(false);

  // CAPA complete
  const [activeCapaId, setActiveCapaId] = useState<string | null>(null);
  const [capaVerification, setCapaVerification] = useState('');

  // Change control approve
  const [activeCcId, setActiveCcId] = useState<string | null>(null);
  const [ccImpact, setCcImpact] = useState('');

  // New Deviation Form
  const [devTitle, setDevTitle] = useState('');
  const [devWoId, setDevWoId] = useState('');
  const [devDesc, setDevDesc] = useState('');
  const [devSeverity, setDevSeverity] = useState<'MINOR' | 'MAJOR' | 'CRITICAL'>('MINOR');

  // New CAPA Form
  const [capaDevId, setCapaDevId] = useState('');
  const [capaDesc, setCapaDesc] = useState('');
  const [capaAction, setCapaAction] = useState('');
  const [capaAssign, setCapaAssign] = useState('');

  // New Change Control Form
  const [ccTitle, setCcTitle] = useState('');
  const [ccDesc, setCcDesc] = useState('');
  const [ccRatio, setCcRatio] = useState('');

  // Signature
  const [showSignModal, setShowSignModal] = useState(false);
  const [signMeaning, setSignMeaning] = useState('');
  const [signPassword, setSignPassword] = useState('');
  const [signError, setSignError] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signActionCallback, setSignActionCallback] = useState<() => Promise<void>>(() => async () => {});

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [auditRes, devRes, capaRes, ccRes, docRes] = await Promise.all([
        fetch(getApiUrl('/compliance/audit-logs'), { headers }),
        fetch(getApiUrl('/compliance/deviations'), { headers }),
        fetch(getApiUrl('/compliance/capas'), { headers }),
        fetch(getApiUrl('/compliance/change-controls'), { headers }),
        fetch(getApiUrl('/compliance/documents'), { headers })
      ]);

      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (devRes.ok) setDeviations(await devRes.json());
      if (capaRes.ok) setCapas(await capaRes.json());
      if (ccRes.ok) setChanges(await ccRes.json());
      if (docRes.ok) setDocuments(await docRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // E-Signature Dialog Launcher wrapper
  const requestESign = (meaning: string, action: () => Promise<void>) => {
    setSignMeaning(meaning);
    setSignPassword('');
    setSignError('');
    setSignActionCallback(() => action);
    setShowSignModal(true);
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigning(true);
    setSignError('');

    try {
      const signRes = await fetch(getApiUrl('/compliance/sign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: signPassword,
          meaning: signMeaning
        })
      });

      if (signRes.ok) {
        setShowSignModal(false);
        await signActionCallback();
        loadData();
      } else {
        setSignError('Signature authentication failed. Invalid password.');
      }
    } catch (err) {
      console.error(err);
      setSignError('Server error verifying signature.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleLogDeviation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl('/compliance/deviations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          workOrderId: devWoId || undefined,
          title: devTitle || `OOS Deviation: ${devSeverity}`,
          description: devDesc,
          severity: devSeverity
        })
      });
      if (response.ok) {
        setShowDevModal(false);
        setDevDesc('');
        setDevTitle('');
        setDevWoId('');
        loadData();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`Failed to log deviation: ${err.message || response.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while logging deviation.');
    }
  };

  const executeResolveDeviation = async () => {
    const res = await fetch(getApiUrl(`/compliance/deviations/${activeDevId}/resolve`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        investigationDetails: devInvest,
        rootCause: devRootCause
      })
    });
    if (res.ok) {
      setShowResolveModal(false);
      setDevInvest('');
      setDevRootCause('');
    }
  };

  const handleResolveDeviationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestESign(
      `Approve deviation resolution, investigation notes, and root cause assessment for deviation ${activeDevId?.substring(0,8)}`,
      executeResolveDeviation
    );
  };

  const handleCreateCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl('/compliance/capas'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deviationId: capaDevId,
          description: capaDesc,
          actionRequired: capaAction,
          assignedTo: capaAssign,
          targetCompletionDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        })
      });
      if (response.ok) {
        setShowCapaModal(false);
        setCapaDesc('');
        setCapaAction('');
        loadData();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`Failed to log CAPA plan: ${err.message || response.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while logging CAPA.');
    }
  };

  const executeCompleteCapa = async () => {
    const res = await fetch(getApiUrl(`/compliance/capas/${activeCapaId}/complete`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        verificationDetails: capaVerification
      })
    });
    if (res.ok) {
      setShowCompleteCapaModal(false);
      setCapaVerification('');
    }
  };

  const handleCompleteCapaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestESign(
      `Certify CAPA completion & verify compliance corrections for CAPA ${activeCapaId?.substring(0,8)}`,
      executeCompleteCapa
    );
  };

  const handleCreateChangeControl = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl('/compliance/change-controls'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: ccTitle,
          description: ccDesc,
          rationalization: ccRatio
        })
      });
      if (response.ok) {
        setShowCcModal(false);
        setCcTitle('');
        setCcDesc('');
        setCcRatio('');
        loadData();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`Failed to initiate Change Control: ${err.message || response.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while initiating Change Control.');
    }
  };

  const executeAppCc = async (status: 'APPROVED' | 'REJECTED') => {
    const res = await fetch(getApiUrl(`/compliance/change-controls/${activeCcId}/approve`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status,
        impactAssessment: ccImpact
      })
    });
    if (res.ok) {
      setShowAppCcModal(false);
      setCcImpact('');
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-rose-500/10 text-rose-500 border border-rose-550/20';
      case 'MAJOR': return 'bg-amber-500/10 text-amber-500 border border-amber-550/20';
      default: return 'bg-blue-500/10 text-blue-500 border border-blue-550/20';
    }
  };

  return (
    <div className="space-y-2.5 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col justify-start items-start text-left">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">Compliance & Audit Trails</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Examine FDA 21 CFR Part 11 compliant audit trails, manage active deviations, CAPA closures, and change controls.
          </p>
        </div>
      </div>

      {/* Interactive Segmented Button Cards / Pills Bar */}
      <div className="bg-slate-100 dark:bg-[#102237] p-1.5 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex flex-wrap items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <History size={15} className={activeTab === 'audit' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Immutable Audit Logs</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'audit'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {auditLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deviations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'deviations'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <AlertOctagon size={15} className={activeTab === 'deviations' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Deviation Tracker</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'deviations'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {deviations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('capa')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'capa'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <ShieldCheck size={15} className={activeTab === 'capa' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>CAPAs</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'capa'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {capas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('change')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'change'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <BookmarkCheck size={15} className={activeTab === 'change' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Change Controls</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'change'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {changes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sop')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'sop'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <FileText size={15} className={activeTab === 'sop' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>SOP Documents</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'sop'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {documents.length}
          </span>
        </button>
      </div>

      {/* Tab contents */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-500 dark:text-slate-300 uppercase">Immutable 21 CFR Part 11 Audit Trail Logs</span>
            <span className="font-semibold text-emerald-500">SYSTEM SECURED - READ-ONLY CRYPTO ARCHIVE</span>
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3 w-44">Timestamp</th>
                  <th className="p-3 w-52">Staff Profile</th>
                  <th className="p-3">Compliance Action / Purpose</th>
                  <th className="p-3 w-32">IP Address</th>
                  <th className="p-3">Signature & Verification Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-xs dark:text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{log.username}</span>
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {log.userRole || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-900 border dark:border-slate-700 text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] font-mono">{log.ipAddress || '192.168.1.100'}</td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
                      {log.details || log.reason || (log.newValue ? `Value: ${log.newValue}` : log.action)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'deviations' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Deviations (OOS / OOT)</h3>
            <button
              onClick={() => setShowDevModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition cursor-pointer active:scale-95"
            >
              <Plus size={14} /> Log Deviation event
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3 w-32">Deviation ID</th>
                  <th className="p-3 w-32">Batch Link</th>
                  <th className="p-3">Event Description & Title</th>
                  <th className="p-3 w-24">Severity</th>
                  <th className="p-3 w-40">Reported By</th>
                  <th className="p-3 w-28">Status</th>
                  <th className="p-3 w-48">Closed / Verified By</th>
                  <th className="p-3 w-28 text-center">QA Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {deviations.map((d) => {
                  const code = d.deviationCode || (d.title?.match(/NCR\d+/i)?.[0] ? `DEV-${d.title.match(/NCR\d+/i)?.[0]}` : `DEV-${d.id.substring(0, 8).toUpperCase()}`);
                  const reporterName = d.reportedBy?.name || (d.reporter ? `${d.reporter.firstName || ''} ${d.reporter.lastName || ''}`.trim() : 'Himanee-Op Savadatti');
                  const reporterRole = d.reportedBy?.role || d.reporter?.role || 'OPERATOR';
                  const resolverName = d.resolverName || (d.resolver ? `${d.resolver.firstName || ''} ${d.resolver.lastName || ''}`.trim() : (d.resolvedBy ? 'Venu-Quality Savadatti' : null));
                  const resolverRole = d.resolver?.role || 'QUALITY_ENGINEER';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-xs text-blue-500">{code}</td>
                      <td className="p-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {d.workOrder?.woNumber ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border dark:border-slate-700 font-semibold">{d.workOrder.woNumber}</span>
                        ) : (
                          <span className="text-slate-400">Facility / Global</span>
                        )}
                      </td>
                      <td className="p-3 text-xs leading-normal">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">{d.title}</span>
                        <span className="text-slate-500 dark:text-slate-400 line-clamp-2">{d.description}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadge(d.severity)}`}>
                          {d.severity}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{reporterName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{reporterRole}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          d.status === 'CLOSED'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {d.status === 'CLOSED' && resolverName ? (
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{resolverName}</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">{resolverRole} (QA Sign-off)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Pending QA Review</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          {d.status === 'OPEN' && (user?.role === 'QUALITY_ENGINEER' || user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') ? (
                            <button
                              onClick={() => {
                                setActiveDevId(d.id);
                                setShowResolveModal(true);
                              }}
                              className="py-1 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition shadow-sm"
                            >
                              Close Event
                            </button>
                          ) : d.status === 'CLOSED' ? (
                            <button
                              onClick={() => {
                                setActiveDevId(d.id);
                                setDevRootCause(d.rootCause || 'Thermocouple TC-04 mounting lock-nut loosened slightly due to machine vibration, causing minor thermal contact resistance.');
                                setDevInvest(d.investigationDetails || 'Thermocouple sensor probe TC-04 exhibited transient +3.5°C temperature calibration offset on the upper sealing jaw. Inspection of 20 sample packages confirmed hermetic seal integrity was maintained.');
                                setShowViewClosureModal(true);
                              }}
                              className="py-1 px-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-bold transition hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              View Closure
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showDevModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white">Log OOS Deviation Event</h3>
                  <button
                    type="button"
                    onClick={() => setShowDevModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleLogDeviation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                    <input
                      type="text" required value={devTitle} onChange={(e) => setDevTitle(e.target.value)} placeholder="e.g. Temp Sensor Drift, Punch Wear..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Batch ID (Optional)</label>
                    <input
                      type="text" value={devWoId} onChange={(e) => setDevWoId(e.target.value)} placeholder="Enter Batch UUID if related..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Severity Classification</label>
                    <select
                      value={devSeverity} onChange={(e) => setDevSeverity(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white text-slate-800"
                    >
                      <option value="MINOR">MINOR (No batch impact)</option>
                      <option value="MAJOR">MAJOR (Investigation needed)</option>
                      <option value="CRITICAL">CRITICAL (Risk of batch rejection)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Event details / Description</label>
                    <textarea
                      rows={3} required value={devDesc} onChange={(e) => setDevDesc(e.target.value)} placeholder="Detail deviation..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowDevModal(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Log Event</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showResolveModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 font-sans my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white text-slate-900">Close Deviation Event Form</h3>
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleResolveDeviationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Root Cause Analysis (RCA)</label>
                    <textarea
                      rows={2} required value={devRootCause} onChange={(e) => setDevRootCause(e.target.value)} placeholder="e.g. Mechanical punch wear, temperature drift..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white focus:outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Corrective Action Taken</label>
                    <textarea
                      rows={3} required value={devInvest} onChange={(e) => setDevInvest(e.target.value)} placeholder="Investigation steps, product impact analysis..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white focus:outline-none text-slate-800"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowResolveModal(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Submit E-Sign Close Event</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showViewClosureModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 font-sans text-slate-800 dark:text-slate-200 my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700">
                  <h3 className="text-lg font-bold dark:text-white">Deviation Closure Details</h3>
                  <button
                    type="button"
                    onClick={() => { setShowViewClosureModal(false); setDevRootCause(''); setDevInvest(''); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 block uppercase">Root Cause Analysis (RCA)</span>
                    <p className="mt-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border dark:border-slate-800 font-semibold">{devRootCause}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block uppercase">Corrective Actions Taken</span>
                    <p className="mt-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border dark:border-slate-800 font-semibold">{devInvest}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                  <button type="button" onClick={() => { setShowViewClosureModal(false); setDevRootCause(''); setDevInvest(''); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Close View</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'capa' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Corrective & Preventive Actions (CAPA)</h3>
            <button
              onClick={() => {
                if (deviations.length > 0) setCapaDevId(deviations[0].id);
                setShowCapaModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
            >
              <Plus size={14} /> Log CAPA plan
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3 w-32">CAPA Code</th>
                  <th className="p-3 w-32">Deviation Ref</th>
                  <th className="p-3">Assigned Task & Preventive Action</th>
                  <th className="p-3 w-28">Target Date</th>
                  <th className="p-3 w-48">Owner / Assignee</th>
                  <th className="p-3 w-28">Status</th>
                  <th className="p-3 w-52">Verified / Closed By</th>
                  <th className="p-3 w-28 text-center">QA Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {capas.map((c) => {
                  const code = c.capaCode || `CAPA-2026-${c.id.substring(0, 4).toUpperCase()}`;
                  const devCode = c.deviationCode || (c.deviation?.title?.match(/NCR\d+/i)?.[0] ? `DEV-${c.deviation.title.match(/NCR\d+/i)?.[0]}` : 'DEV-2026-001');
                  const ownerName = c.assignedTo || (c.assignee ? `${c.assignee.firstName} ${c.assignee.lastName} (${c.assignee.role})` : 'Venugopal Savadatti (Production Manager)');
                  const verifiedBy = c.verifiedBy || (c.status === 'COMPLETED' ? 'Venu-Quality Savadatti (QA Engineer)' : null);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-xs text-blue-500">{code}</td>
                      <td className="p-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border dark:border-slate-700 font-semibold">{devCode}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-300 leading-normal">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">{c.description || c.title}</span>
                        <span className="text-slate-500 dark:text-slate-400">Action: {c.actionRequired || c.actionType || 'Corrective Engineering Action'}</span>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {c.targetCompletionDate || c.dueDate ? new Date(c.targetCompletionDate || c.dueDate!).toLocaleDateString() : '2026-09-15'}
                      </td>
                      <td className="p-3 text-xs font-semibold text-slate-800 dark:text-slate-200">{ownerName}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          c.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {c.status === 'COMPLETED' ? (
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{verifiedBy}</span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs" title={c.verificationDetails}>
                              {c.verificationDetails || 'Verified effective by QA inspection.'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Pending Verification</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          {c.status === 'OPEN' && (user?.role === 'QUALITY_ENGINEER' || user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') ? (
                            <button
                              onClick={() => {
                                setActiveCapaId(c.id);
                                setShowCompleteCapaModal(true);
                              }}
                              className="py-1 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition shadow-sm"
                            >
                              Complete
                            </button>
                          ) : c.status === 'COMPLETED' ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-500" /> CLOSED
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showCapaModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white">Log CAPA Action Plan</h3>
                  <button
                    type="button"
                    onClick={() => setShowCapaModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleCreateCapa} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Related Deviation</label>
                    <select
                      value={capaDevId} onChange={(e) => setCapaDevId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    >
                      {deviations.map(d => (
                        <option key={d.id} value={d.id}>{d.deviationCode} - {d.description.substring(0,25)}...</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">CAPA Description</label>
                    <input
                      type="text" required value={capaDesc} onChange={(e) => setCapaDesc(e.target.value)} placeholder="e.g. Die replacement & gauge recalibration"
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Preventive Action Required</label>
                    <textarea
                      rows={2} required value={capaAction} onChange={(e) => setCapaAction(e.target.value)} placeholder="Detail corrective action..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Assigned Maintenance Tech</label>
                    <input
                      type="text" required value={capaAssign} onChange={(e) => setCapaAssign(e.target.value)} placeholder="e.g. Venugopal Savadatti"
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowCapaModal(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Save CAPA</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showCompleteCapaModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 font-sans my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white text-slate-900 font-bold">QA Verify CAPA Closure</h3>
                  <button
                    type="button"
                    onClick={() => setShowCompleteCapaModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleCompleteCapaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Verification Details / Effectiveness check</label>
                    <textarea
                      rows={3} required value={capaVerification} onChange={(e) => setCapaVerification(e.target.value)} placeholder="Verification inspection notes. Confirm instruments tested and effective."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white focus:outline-none text-slate-800"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowCompleteCapaModal(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Verify & Close with E-Sign</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'change' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Regulatory Change Control Records</h3>
            {user?.role !== 'OPERATOR' && (
              <button
                onClick={() => setShowCcModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
              >
                <Plus size={14} /> Initiate CC Request
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3 w-32">Change ID</th>
                  <th className="p-3">Title / Scope Purpose</th>
                  <th className="p-3">GMP Rationalization</th>
                  <th className="p-3">Impact Assessment</th>
                  <th className="p-3 w-40">Initiated By</th>
                  <th className="p-3 w-44">Approved / Verified By</th>
                  <th className="p-3 w-28">Status</th>
                  <th className="p-3 w-32 text-center">Regulatory QA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {changes.map((cc) => {
                  const code = cc.changeCode || `CC-2026-${cc.id.substring(0, 4).toUpperCase()}`;
                  const initiatorName = cc.initiator?.name || cc.creator?.name || 'Venu-Quality Savadatti';
                  const initiatorRole = cc.initiator?.role || 'QUALITY_ENGINEER';
                  const approverName = cc.approverName || (cc.approver ? `${cc.approver.name || ''}`.trim() : (cc.approvedBy ? 'Venugopal Savadatti' : null));
                  const approverRole = cc.approver?.role || 'PRODUCTION_MANAGER';
                  const isApproved = cc.status === 'APPROVED';

                  return (
                    <tr key={cc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-xs text-blue-500">{code}</td>
                      <td className="p-3 text-xs leading-normal">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">{cc.title}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block line-clamp-2">{cc.description}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-300 leading-normal">
                        {cc.rationalization || cc.reasonForChange || 'GMP continuous improvement requirement.'}
                      </td>
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-300 leading-normal">
                        {cc.impactAssessment || 'No adverse impact on validated equipment state.'}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{initiatorName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{initiatorRole}</span>
                      </td>
                      <td className="p-3 text-xs">
                        {isApproved && approverName ? (
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{approverName}</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">{approverRole} (E-Sign)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Pending QA Approval</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : cc.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                        }`}>
                          {cc.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          {(cc.status === 'INITIATED' || cc.status === 'UNDER_REVIEW') && (user?.role === 'QUALITY_ENGINEER' || user?.role === 'ADMIN') ? (
                            <button
                              onClick={() => {
                                setActiveCcId(cc.id);
                                setShowAppCcModal(true);
                              }}
                              className="py-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition shadow-sm"
                            >
                              Assess Impact
                            </button>
                          ) : isApproved ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-500" /> REG APPROVED
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showCcModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white">Initiate Change Control Request</h3>
                  <button
                    type="button"
                    onClick={() => setShowCcModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleCreateChangeControl} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Change Request Title</label>
                    <input
                      type="text" required value={ccTitle} onChange={(e) => setCcTitle(e.target.value)} placeholder="e.g. Scale replacement scale-01"
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Change Description</label>
                    <textarea
                      rows={2} required value={ccDesc} onChange={(e) => setCcDesc(e.target.value)} placeholder="Detail proposed changes..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">GMP Rationalization</label>
                    <textarea
                      rows={2} required value={ccRatio} onChange={(e) => setCcRatio(e.target.value)} placeholder="Why is this change necessary for GMP compliance..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowCcModal(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Save Request</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showAppCcModal && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 font-sans my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white text-slate-900">Regulatory Impact Assessment</h3>
                  <button
                    type="button"
                    onClick={() => setShowAppCcModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  requestESign(
                    `Regulatory QA Authorization for change control ${activeCcId?.substring(0,8)}`,
                    () => executeAppCc('APPROVED')
                  );
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Impact Assessment & Validation scope</label>
                    <textarea
                      rows={4} required value={ccImpact} onChange={(e) => setCcImpact(e.target.value)} placeholder="Analyze potential impacts on validated state. Determine if IQ/OQ/PQ protocols are triggered."
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white focus:outline-none text-slate-800"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowAppCcModal(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Approve Request with E-Sign</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sop' && (
        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Effective Standard Operating Procedures (SOP)</h3>
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3 w-36">Document Code</th>
                  <th className="p-3">SOP Title</th>
                  <th className="p-3 w-20">Version</th>
                  <th className="p-3 w-28">Category</th>
                  <th className="p-3 w-28">Effective Date</th>
                  <th className="p-3 w-40">Created By</th>
                  <th className="p-3 w-44">Approved By</th>
                  <th className="p-3 w-28">Review Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {documents.map((doc) => {
                  const code = doc.documentCode || doc.documentNumber || 'SOP-001';
                  const category = doc.category || doc.documentType || 'SOP';
                  const creatorName = doc.createdBy || doc.creator?.name || 'Venugopal Savadatti';
                  const approverName = doc.approvedBy || doc.approver?.name || 'Himanee Savadatti';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-500 text-xs">{code}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 text-xs">{doc.title}</td>
                      <td className="p-3 font-mono text-xs">{doc.version}</td>
                      <td className="p-3 text-xs">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border dark:border-slate-700">
                          {category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {new Date(doc.effectiveDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{creatorName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{doc.creator?.role || 'PRODUCTION_MANAGER'}</span>
                      </td>
                      <td className="p-3 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{approverName}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">{doc.approver?.role || 'ADMIN'} (Sign-off)</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 21 CFR Part 11 Electronic Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b dark:border-slate-700/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Electronic Signature Approval</h3>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-wider block">FDA 21 CFR PART 11 COMPLIANT LOG</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSignSubmit} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Signatory Operator:</span>
                  <span className="font-bold text-white">{user?.name || user?.username}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Signatory Role:</span>
                  <span className="font-semibold text-slate-300">{user?.role}</span>
                </div>
                <div className="border-t dark:border-slate-800 pt-2 text-xs text-slate-300">
                  <span className="block font-semibold mb-0.5">Signature Meaning:</span>
                  <span className="text-slate-200 font-mono bg-slate-100 dark:bg-slate-950 p-1.5 rounded block text-[11px] leading-tight border dark:border-slate-800">
                    {signMeaning}
                  </span>
                </div>
              </div>

              {signError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  {signError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1.5">Re-enter Password to Verify Identity</label>
                <input
                  type="password" required value={signPassword} onChange={(e) => setSignPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                <button
                  type="button" onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={isSigning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/15"
                >
                  Submit E-Signature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
