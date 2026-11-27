import React, { useState, useEffect } from 'react';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getApiUrl } from '../config';
import { toast } from '../context/toastStore';
import {
  ClipboardList,
  Plus,
  Play,
  CheckCircle2,
  FileDown,
  Lock,
  Check,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  X,
  Pause,
  ListChecks,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

interface Requirement {
  id: string;
  phase: 'PRE_START' | 'EXECUTION';
  kind: 'MANUAL' | 'MATERIAL' | 'QUALITY' | 'PRODUCTION' | 'WEIGHING' | 'VERIFIER';
  label: string;
  allowNotApplicable?: boolean;
}

interface WorkOrder {
  id: string;
  woNumber: string;
  productId: string;
  productName: string;
  productSku: string;
  targetQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  plannedStart: string;
  plannedEnd: string;
  status: 'DRAFT' | 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'REVIEWED' | 'CLOSED';
  revision: number;
  recipeId: string | null;
  availableActions: string[];
  unmetPrerequisites: string[];
  requirements: Requirement[];
  preStartMissing: string[];
  checks: any[];
}

// Workflow actions the server may offer. The server decides which are available;
// this table only describes how to present them.
const ACTION_META: Record<string, { label: string; title: string; needsPassword: boolean; gated?: boolean; icon: React.ComponentType<{ size?: number }> }> = {
  PLAN: { label: 'Plan', title: 'Move the draft order to Planned', needsPassword: false, icon: ClipboardList },
  RELEASE: { label: 'Release', title: 'Release the batch for production', needsPassword: false, icon: Play },
  START: { label: 'Start Run', title: 'Start the production run', needsPassword: false, icon: Play },
  PAUSE: { label: 'Pause', title: 'Pause the run', needsPassword: false, icon: Pause },
  RESUME: { label: 'Resume', title: 'Resume the run', needsPassword: false, icon: Play },
  APPROVE_SHORTFALL: { label: 'Approve shortfall', title: 'Approve completing below target quantity (signed)', needsPassword: true, icon: ShieldCheck },
  COMPLETE: { label: 'Complete', title: 'Mark the run complete', needsPassword: false, gated: true, icon: CheckCircle2 },
  REVIEW: { label: 'Review', title: 'Independent supervisor review (signed)', needsPassword: true, gated: true, icon: Check },
  REJECT_REVIEW: { label: 'Reject review', title: 'Send the batch back to Completed', needsPassword: false, icon: RotateCcw },
  CLOSE: { label: 'Close batch', title: 'Manager closure after review (signed)', needsPassword: true, gated: true, icon: Lock },
};

export default function WorkOrders() {
  const { token, user } = useShopfloorStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkOrder['status']>('ALL');

  const filteredWorkOrders = statusFilter === 'ALL'
    ? workOrders
    : workOrders.filter(w => w.status === statusFilter);

  // Modals and inputs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWoNumber, setNewWoNumber] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newRecipeId, setNewRecipeId] = useState('');
  const [newQty, setNewQty] = useState(1000);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newReason, setNewReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [productsList, setProductsList] = useState<{ id: string; sku: string; name: string }[]>([]);
  const [recipesList, setRecipesList] = useState<{ id: string; productId: string; recipeCode: string; recipeName: string; version: string; status: string }[]>([]);

  const toLocalInput = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const canCreateWo = user?.role === 'PRODUCTION_MANAGER' || user?.role === 'ADMIN';
  const openCreate = () => {
    const now = new Date();
    setNewStart(toLocalInput(now));
    setNewEnd(toLocalInput(new Date(now.getTime() + 48 * 60 * 60 * 1000)));
    setNewWoNumber('');
    setNewRecipeId('');
    setNewReason('');
    setNewQty(1000);
    setNewProductId(productsList[0]?.id || '');
    setShowCreateModal(true);
  };
  
  // Workflow action dialog state (server-driven: transitions API)
  const [actionDlg, setActionDlg] = useState<{ wo: WorkOrder; action: string } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionPassword, setActionPassword] = useState('');
  const [actionRecipeId, setActionRecipeId] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMissing, setActionMissing] = useState<string[]>([]);
  const [actionBusy, setActionBusy] = useState(false);

  // Evidence panel state
  const [evWo, setEvWo] = useState<WorkOrder | null>(null);
  const [evNotes, setEvNotes] = useState<Record<string, string>>({});
  const [evOutcome, setEvOutcome] = useState<Record<string, string>>({});
  const [evPassword, setEvPassword] = useState('');
  const [evBusy, setEvBusy] = useState<string | null>(null);
  const [evError, setEvError] = useState('');

  const fetchProducts = async () => {
    try {
      const response = await fetch(getApiUrl('/recipes/products'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProductsList(data);
      }
      const rr = await fetch(getApiUrl('/recipes'), { headers: { Authorization: `Bearer ${token}` } });
      if (rr.ok) setRecipesList(await rr.json());
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/work-orders'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const formatted = data.map(mapOrder);
        setWorkOrders(formatted);
      }
    } catch (err) {
      console.error('Error fetching work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchProducts();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductId) { toast.error('Select a product'); return; }
    const start = new Date(newStart), end = new Date(newEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      toast.error('Planned end must be after planned start');
      return;
    }
    if (!Number.isInteger(newQty) || newQty <= 0) { toast.error('Target quantity must be a whole number above 0'); return; }
    setCreating(true);
    try {
      const response = await fetch(getApiUrl('/work-orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          woNumber: newWoNumber.trim() || undefined,
          productId: newProductId,
          recipeId: newRecipeId || undefined,
          targetQuantity: newQty,
          plannedStart: start.toISOString(),
          plannedEnd: end.toISOString(),
          reason: newReason.trim() || undefined,
        }),
      });
      if (response.ok) {
        const created = await response.json();
        toast.success(`${created.woNumber} created as PLANNED`);
        setShowCreateModal(false);
        setStatusFilter('PLANNED');
        fetchWorkOrders();
      } else {
        const err = await response.json().catch(() => null);
        const msg = Array.isArray(err?.message) ? err.message.join(', ') : err?.message;
        toast.error(typeof msg === 'string' && msg ? msg : 'Failed to create work order');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error creating work order');
    } finally {
      setCreating(false);
    }
  };

  const mapOrder = (item: any): WorkOrder => ({
    id: item.id,
    woNumber: item.woNumber,
    productId: item.productId,
    productName: item.productName || (item.product?.name) || item.productSku || 'Master Recipe Product',
    productSku: item.productSku || (item.product?.sku) || 'N/A',
    targetQuantity: item.targetQuantity,
    completedQuantity: item.completedQuantity || 0,
    scrapQuantity: item.scrapQuantity || 0,
    plannedStart: new Date(item.plannedStart).toISOString().split('T')[0],
    plannedEnd: new Date(item.plannedEnd).toISOString().split('T')[0],
    status: item.status,
    revision: item.revision ?? 0,
    recipeId: item.recipeId ?? null,
    availableActions: Array.isArray(item.availableActions) ? item.availableActions : [],
    unmetPrerequisites: Array.isArray(item.unmetPrerequisites) ? item.unmetPrerequisites : [],
    requirements: Array.isArray(item.requirements) ? item.requirements : [],
    preStartMissing: Array.isArray(item.evidence?.preStartMissing) ? item.evidence.preStartMissing : [],
    checks: Array.isArray(item.evidence?.checks) ? item.evidence.checks : [],
  });

  // Reload one order (fresh revision + blockers) and update the list
  const loadOrder = async (id: string): Promise<WorkOrder | null> => {
    try {
      const r = await fetch(getApiUrl(`/work-orders/${id}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      const o = mapOrder(await r.json());
      setWorkOrders((prev) => prev.map((w) => (w.id === id ? o : w)));
      return o;
    } catch {
      return null;
    }
  };

  const errorFrom = async (res: Response, fallback: string) => {
    const err = await res.json().catch(() => null);
    const msg = Array.isArray(err?.message) ? err.message.join(', ') : err?.message;
    return {
      message: typeof msg === 'string' && msg ? msg : fallback,
      missing: Array.isArray(err?.missing) ? (err.missing as string[]) : [],
    };
  };

  const openAction = (wo: WorkOrder, action: string) => {
    setActionDlg({ wo, action });
    setActionReason('');
    setActionPassword('');
    setActionRecipeId('');
    setActionError('');
    setActionMissing([]);
  };

  const submitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDlg) return;
    const { wo, action } = actionDlg;
    const meta = ACTION_META[action] || { label: action, needsPassword: false };
    if (!actionReason.trim()) { setActionError('A reason is required for the audit trail'); return; }
    if (meta.needsPassword && !actionPassword) { setActionError('Enter your password to sign this action'); return; }
    if (action === 'RELEASE' && !wo.recipeId && !actionRecipeId) { setActionError('Select the recipe version to release'); return; }

    setActionBusy(true);
    setActionError('');
    setActionMissing([]);
    try {
      const fresh = await loadOrder(wo.id);
      const res = await fetch(getApiUrl(`/work-orders/${wo.id}/transitions`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action,
          expectedRevision: fresh?.revision ?? wo.revision,
          reason: actionReason.trim(),
          password: meta.needsPassword ? actionPassword : undefined,
          recipeId: action === 'RELEASE' && !wo.recipeId ? actionRecipeId : undefined,
        }),
      });
      if (res.ok) {
        toast.success(`${meta.label} completed for ${wo.woNumber}`);
        setActionDlg(null);
        fetchWorkOrders();
      } else {
        const er = await errorFrom(res, `${meta.label} failed`);
        setActionError(res.status === 409 ? 'This order was changed by someone else and has been reloaded. Please review and try again.' : er.message);
        setActionMissing(er.missing);
        if (res.status === 409) fetchWorkOrders();
      }
    } catch (err) {
      console.error(err);
      setActionError('Server error while performing the action');
    } finally {
      setActionBusy(false);
    }
  };

  const openEvidence = async (wo: WorkOrder) => {
    setEvNotes({});
    setEvOutcome({});
    setEvPassword('');
    setEvError('');
    setEvWo(wo);
    const fresh = await loadOrder(wo.id);
    if (fresh) setEvWo(fresh);
  };

  const recordEvidence = async (r: Requirement) => {
    if (!evWo) return;
    const notes = (evNotes[r.id] || '').trim();
    const outcome = evOutcome[r.id] || 'RECORDED';
    if (!notes) { setEvError('An evidence note is required'); return; }
    if ((outcome === 'RESOLVED' || outcome === 'NOT_APPLICABLE') && !evPassword) {
      setEvError('Enter a supervisor or manager password to ' + (outcome === 'RESOLVED' ? 'resolve this item' : 'waive this item'));
      return;
    }
    setEvBusy(r.id);
    setEvError('');
    try {
      const fresh = await loadOrder(evWo.id);
      const res = await fetch(getApiUrl(`/work-orders/${evWo.id}/evidence`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requirementId: r.id,
          outcome,
          notes,
          password: outcome === 'RESOLVED' || outcome === 'NOT_APPLICABLE' ? evPassword : undefined,
          expectedRevision: fresh?.revision ?? evWo.revision,
        }),
      });
      if (res.ok) {
        toast.success(`Recorded ${r.id}`);
        setEvNotes((p) => ({ ...p, [r.id]: '' }));
        const upd = await loadOrder(evWo.id);
        if (upd) setEvWo(upd);
      } else {
        setEvError((await errorFrom(res, 'Could not record evidence')).message);
      }
    } catch (err) {
      console.error(err);
      setEvError('Server error while recording evidence');
    } finally {
      setEvBusy(null);
    }
  };

  const downloadEbrPdf = async (workOrderId: string, woNumber: string) => {
    try {
      const response = await fetch(getApiUrl(`/ebr/${workOrderId}/pdf`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EBR-${woNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to generate EBR PDF');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching EBR PDF');
    }
  };

  const statusBadges = {
    DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-700/30',
    PLANNED: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    RELEASED: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
    IN_PROGRESS: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    PAUSED: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    COMPLETED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    CLOSED: 'bg-slate-500/15 text-slate-400 border border-slate-700/50',
  };

  return (
    <div className="space-y-2.5 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col justify-start items-start text-left">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">Manufacturing Batch Records</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Author and release Master Batch Records (MBR), monitor active batches, and review completed Electronic Batch Records (EBR).
          </p>
        </div>
        {canCreateWo && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} /> New Work Order
          </button>
        )}
      </div>

      {/* Interactive Segmented Button Cards / Pills Filter Bar */}
      <div className="bg-slate-100 dark:bg-[#102237] p-1.5 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex flex-wrap items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'ALL'
              ? 'bg-[#174A7C] text-white shadow-md ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/40 border border-[#174A7C]'
              : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:bg-slate-50 dark:hover:bg-[#1A365D] hover:border-[#174A7C] dark:hover:border-blue-400 hover:text-[#174A7C] dark:hover:text-white hover:shadow-sm'
          }`}
        >
          <ClipboardList size={15} className={statusFilter === 'ALL' ? 'text-white dark:text-[#F5A623]' : 'text-slate-500 dark:text-slate-400'} />
          <span>All Batches</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'ALL'
              ? 'bg-white/20 text-white font-extrabold'
              : 'bg-slate-100 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
          }`}>
            {workOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PLANNED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'PLANNED'
              ? 'bg-[#174A7C] text-white shadow-md ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/40 border border-[#174A7C]'
              : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:bg-slate-50 dark:hover:bg-[#1A365D] hover:border-[#174A7C] dark:hover:border-blue-400 hover:text-[#174A7C] dark:hover:text-white hover:shadow-sm'
          }`}
        >
          <span>Planned</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'PLANNED'
              ? 'bg-white/20 text-white font-extrabold'
              : 'bg-slate-100 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
          }`}>
            {workOrders.filter(w => w.status === 'PLANNED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('RELEASED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'RELEASED'
              ? 'bg-[#174A7C] text-white shadow-md ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/40 border border-[#174A7C]'
              : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:bg-slate-50 dark:hover:bg-[#1A365D] hover:border-[#174A7C] dark:hover:border-blue-400 hover:text-[#174A7C] dark:hover:text-white hover:shadow-sm'
          }`}
        >
          <span>Released</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'RELEASED'
              ? 'bg-white/20 text-white font-extrabold'
              : 'bg-slate-100 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
          }`}>
            {workOrders.filter(w => w.status === 'RELEASED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-[#174A7C] text-white shadow-md ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/40 border border-[#174A7C]'
              : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:bg-slate-50 dark:hover:bg-[#1A365D] hover:border-[#174A7C] dark:hover:border-blue-400 hover:text-[#174A7C] dark:hover:text-white hover:shadow-sm'
          }`}
        >
          <span>In Progress</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-white/20 text-white font-extrabold'
              : 'bg-slate-100 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
          }`}>
            {workOrders.filter(w => w.status === 'IN_PROGRESS').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'COMPLETED'
              ? 'bg-[#174A7C] text-white shadow-md ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/40 border border-[#174A7C]'
              : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:bg-slate-50 dark:hover:bg-[#1A365D] hover:border-[#174A7C] dark:hover:border-blue-400 hover:text-[#174A7C] dark:hover:text-white hover:shadow-sm'
          }`}
        >
          <span>Completed</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'COMPLETED'
              ? 'bg-white/20 text-white font-extrabold'
              : 'bg-slate-100 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
          }`}>
            {workOrders.filter(w => w.status === 'COMPLETED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CLOSED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'CLOSED'
              ? 'bg-[#174A7C] text-white shadow-md ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/40 border border-[#174A7C]'
              : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:bg-slate-50 dark:hover:bg-[#1A365D] hover:border-[#174A7C] dark:hover:border-blue-400 hover:text-[#174A7C] dark:hover:text-white hover:shadow-sm'
          }`}
        >
          <span>Closed</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'CLOSED'
              ? 'bg-white/20 text-white font-extrabold'
              : 'bg-slate-100 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
          }`}>
            {workOrders.filter(w => w.status === 'CLOSED').length}
          </span>
        </button>
        {(['DRAFT', 'PAUSED', 'REVIEWED'] as const).map((st) => {
          const n = workOrders.filter((w) => w.status === st).length;
          if (n === 0 && statusFilter !== st) return null;
          return (
            <button key={st} type="button" onClick={() => setStatusFilter(st)} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${statusFilter === st ? 'bg-[#174A7C] text-white shadow' : 'bg-white dark:bg-[#142A45] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-[#1A3556]'}`}>
              <span>{st.charAt(0) + st.slice(1).toLowerCase()}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/10">{n}</span>
            </button>
          );
        })}
      </div>

      {/* Batch Records Table */}
      <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-md rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Active Formulation Batches</span>
          <span className="text-xs text-slate-500">Authorized by 21 CFR Part 11 Electronic Signature Logs</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
              <th className="p-3">Batch ID / MBR</th>
              <th className="p-3">Product Formulation</th>
              <th className="p-3">Yield Progress (Actual / Target)</th>
              <th className="p-3 text-center">First-Pass Yield (RFT)</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">Loading batch records...</td>
              </tr>
            ) : filteredWorkOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">No matching batch records found.</td>
              </tr>
            ) : (
              filteredWorkOrders.map((wo) => {
                const totalYield = wo.completedQuantity + wo.scrapQuantity;
                const yieldPct = totalYield > 0 ? Math.round((wo.completedQuantity / totalYield) * 100 * 10) / 10 : 0;
                
                return (
                  <tr key={wo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/55 transition border-b border-slate-100 dark:border-slate-700/30 last:border-b-0">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{wo.woNumber}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">{wo.id.substring(0, 18)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="block font-bold text-slate-800 dark:text-slate-200">{wo.productSku}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{wo.productName}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {wo.completedQuantity} <span className="text-[10px] text-slate-400">PCS</span>
                          </span>
                          <span className="text-slate-400">Target: {wo.targetQuantity}</span>
                        </div>
                        <div className="w-40 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((wo.completedQuantity / wo.targetQuantity) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {totalYield > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className={yieldPct > 98 ? 'text-emerald-500' : 'text-amber-500'}>{yieldPct}%</span>
                          <span className="text-[10px] text-red-500 font-normal">{wo.scrapQuantity} scrap logged</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-300">N/A</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${(statusBadges as Record<string, string>)[wo.status] || 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2.5">
                        {wo.availableActions.map((a) => {
                          const meta = ACTION_META[a];
                          if (!meta) return null;
                          const blockers = a === 'START' || a === 'RESUME' ? wo.preStartMissing : meta.gated ? wo.unmetPrerequisites : [];
                          const blocked = blockers.length > 0;
                          const Icon = meta.icon;
                          return (
                            <button
                              key={a}
                              onClick={() => (blocked ? openEvidence(wo) : openAction(wo, a))}
                              className={`flex items-center gap-1 py-1 px-2.5 rounded border transition text-xs font-bold cursor-pointer active:scale-95 ${
                                blocked
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7C] text-slate-700 dark:text-slate-300 hover:text-white border-slate-300 dark:border-slate-700'
                              }`}
                              title={blocked ? `Blocked until complete:\n${blockers.join('\n')}\n(click to open the evidence panel)` : meta.title}
                            >
                              <Icon size={12} /> {meta.label}{blocked ? ' (blocked)' : ''}
                            </button>
                          );
                        })}
                        {wo.requirements.length > 0 && wo.status !== 'DRAFT' && wo.status !== 'PLANNED' && (
                          <button
                            onClick={() => openEvidence(wo)}
                            className="flex items-center gap-1 py-1 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded transition text-xs font-bold cursor-pointer"
                            title="View and record checklist evidence"
                          >
                            <ListChecks size={12} /> Evidence
                          </button>
                        )}

                        {/* EBR Dossier PDF download */}
                        {['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'REVIEWED', 'CLOSED'].includes(wo.status) && (
                          <button
                            onClick={() => downloadEbrPdf(wo.id, wo.woNumber)}
                            className="flex items-center gap-1 py-1 px-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 rounded transition text-xs font-bold"
                            title="Download Electronic Batch Record PDF"
                          >
                            <FileDown size={13} /> PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
              <h3 className="text-lg font-bold dark:text-white text-slate-900">New Work Order (Planned)</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Work Order Number</label>
                <input type="text" value={newWoNumber} onChange={(e) => setNewWoNumber(e.target.value)}
                  placeholder="Auto-generated if left blank" className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Product</label>
                <select required value={newProductId} onChange={(e) => { setNewProductId(e.target.value); setNewRecipeId(''); }} className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800">
                  {productsList.length === 0 && <option value="">No products available for this plant</option>}
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Recipe (optional, can be chosen at release)</label>
                <select value={newRecipeId} onChange={(e) => setNewRecipeId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800">
                  <option value="">Select at release</option>
                  {recipesList
                    .filter((r) => r.productId === newProductId && ['ACTIVE', 'RELEASED'].includes(r.status))
                    .map((r) => (
                      <option key={r.id} value={r.id}>{r.recipeCode} v{r.version} - {r.recipeName}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Quantity</label>
                <input type="number" required min={1} step={1} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Planned Start</label>
                  <input type="datetime-local" required value={newStart} onChange={(e) => setNewStart(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Planned End</label>
                  <input type="datetime-local" required value={newEnd} min={newStart} onChange={(e) => setNewEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Note (optional)</label>
                <input type="text" maxLength={500} value={newReason} onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Reason recorded in the audit trail" className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700/80">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition hover:bg-slate-100 dark:hover:bg-slate-700/50">
                  Cancel
                </button>
                <button type="submit" disabled={creating || !newProductId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition shadow-md shadow-blue-600/10">
                  {creating ? 'Creating...' : 'Create Planned Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflow action dialog */}
      {actionDlg && (() => {
        const { wo, action } = actionDlg;
        const meta = ACTION_META[action] || { label: action, needsPassword: false, title: action, icon: Check };
        const recipeChoices = recipesList.filter((r) => r.productId === wo.productId && ['ACTIVE', 'RELEASED'].includes(r.status));
        const inputCls = 'w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800';
        const lblCls = 'block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1.5';
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
              <div className="flex items-center justify-between border-b dark:border-slate-700/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Lock size={20} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{meta.label}: {wo.woNumber}</h3>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider block">
                      {meta.needsPassword ? 'ELECTRONIC SIGNATURE - 21 CFR PART 11' : 'RECORDED IN THE AUDIT TRAIL'}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => setActionDlg(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"><X size={18} /></button>
              </div>

              <form onSubmit={submitAction} className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Product</span><span className="font-bold text-slate-900 dark:text-white">{wo.productSku}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-semibold">{wo.status}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Signed in as</span><span className="font-semibold">{user?.name || user?.username} ({user?.role})</span></div>
                </div>

                {action === 'RELEASE' && (
                  <div>
                    <label className={lblCls}>Recipe version to release</label>
                    {wo.recipeId ? (
                      <div className="text-xs text-slate-500">Recipe was selected when the order was planned.</div>
                    ) : (
                      <select value={actionRecipeId} onChange={(e) => setActionRecipeId(e.target.value)} className={inputCls}>
                        <option value="">Select a recipe...</option>
                        {recipeChoices.map((r) => (
                          <option key={r.id} value={r.id}>{r.recipeCode} v{r.version} - {r.recipeName}</option>
                        ))}
                      </select>
                    )}
                    <div className="text-[11px] text-slate-500 mt-1">The recipe must have an evidence checklist. Add one on the Recipes page if release is refused.</div>
                  </div>
                )}

                <div>
                  <label className={lblCls}>Reason / note (required)</label>
                  <input type="text" maxLength={500} value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Recorded in the audit trail" className={inputCls} />
                </div>

                {meta.needsPassword && (
                  <div>
                    <label className={lblCls}>Re-enter your password to sign</label>
                    <input type="password" value={actionPassword} onChange={(e) => setActionPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                  </div>
                )}

                {actionError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold space-y-1">
                    <div className="flex items-center gap-1.5"><AlertTriangle size={14} /> {actionError}</div>
                    {actionMissing.length > 0 && (
                      <ul className="list-disc pl-5 font-normal">
                        {actionMissing.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                  <button type="button" onClick={() => setActionDlg(null)} className="px-4 py-2 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50">Cancel</button>
                  <button type="submit" disabled={actionBusy} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-blue-600/10">
                    {actionBusy ? 'Working...' : meta.needsPassword ? 'Sign and confirm' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Evidence panel */}
      {evWo && (() => {
        const latest = new Map<string, any>();
        evWo.checks.forEach((c: any) => latest.set(c.requirement_id, c));
        const unmet = (r: Requirement) => evWo.unmetPrerequisites.some((m) => m.startsWith(r.id + ':'));
        const auto = ['MATERIAL', 'QUALITY', 'PRODUCTION', 'WEIGHING', 'VERIFIER'];
        const autoHint: Record<string, string> = {
          MATERIAL: 'Satisfied by dispensing / material consumption records',
          QUALITY: 'Satisfied by a passed quality check on the Quality page',
          PRODUCTION: 'Satisfied by verified production counts',
          WEIGHING: 'Satisfied by weighing records with a scale ID',
          VERIFIER: 'Satisfied by a second-person dispensing verification',
        };
        const phases: { key: string; title: string }[] = [{ key: 'PRE_START', title: 'Before start' }, { key: 'EXECUTION', title: 'During execution' }];
        const inputCls = 'w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white focus:outline-none focus:border-blue-500 text-slate-800';
        const needsPw = evWo.requirements.some((r) => ['RESOLVED', 'NOT_APPLICABLE'].includes(evOutcome[r.id] || ''));
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 w-full max-w-xl h-full overflow-y-auto shadow-2xl border-l-2 border-[#174A7C]/30 p-4 space-y-4">
              <div className="flex items-start justify-between border-b dark:border-slate-700/80 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><ListChecks size={18} /> Evidence: {evWo.woNumber}</h3>
                  <span className="text-xs text-slate-500">{evWo.productSku} - status {evWo.status} - revision {evWo.revision}</span>
                </div>
                <button type="button" onClick={() => setEvWo(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"><X size={18} /></button>
              </div>

              {evError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold flex items-center gap-1.5"><AlertTriangle size={14} /> {evError}</div>
              )}

              {phases.map((ph) => {
                const items = evWo.requirements.filter((r) => r.phase === ph.key);
                if (!items.length) return null;
                return (
                  <div key={ph.key} className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{ph.title}</div>
                    {items.map((r) => {
                      const e = latest.get(r.id);
                      const isAuto = auto.includes(r.kind);
                      const missing = unmet(r);
                      const state = e?.outcome === 'BLOCKING' ? 'BLOCKING' : missing ? 'MISSING' : 'OK';
                      const canRecord = !isAuto && evWo.status !== 'CLOSED';
                      return (
                        <div key={r.id} className="rounded-lg border dark:border-slate-700 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.label}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{r.id} - {r.kind}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${state === 'OK' ? 'bg-emerald-500/15 text-emerald-600' : state === 'BLOCKING' ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-600'}`}>
                              {state === 'OK' ? 'DONE' : state}
                            </span>
                          </div>
                          {e && <div className="text-[11px] text-slate-500">Last: {e.outcome} - {e.details?.notes}</div>}
                          {isAuto && <div className="text-[11px] text-slate-500">{autoHint[r.kind]}</div>}
                          {canRecord && (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <select value={evOutcome[r.id] || 'RECORDED'} onChange={(ev) => setEvOutcome((p) => ({ ...p, [r.id]: ev.target.value }))} className={inputCls + ' max-w-[11rem]'}>
                                  <option value="RECORDED">Recorded</option>
                                  <option value="BLOCKING">Blocking exception</option>
                                  <option value="RESOLVED">Resolved (needs sign-off)</option>
                                  {r.allowNotApplicable && <option value="NOT_APPLICABLE">Not applicable (needs sign-off)</option>}
                                </select>
                                <input type="text" value={evNotes[r.id] || ''} onChange={(ev) => setEvNotes((p) => ({ ...p, [r.id]: ev.target.value }))} placeholder="Evidence note (required)" className={inputCls} />
                              </div>
                              <button type="button" disabled={evBusy === r.id} onClick={() => recordEvidence(r)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded text-xs font-bold">
                                {evBusy === r.id ? 'Saving...' : 'Record'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {needsPw && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Supervisor / manager password (for sign-off outcomes)</label>
                  <input type="password" value={evPassword} onChange={(e) => setEvPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                </div>
              )}

              {evWo.unmetPrerequisites.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <div className="font-bold">Still required before the batch can be completed, reviewed or closed:</div>
                  <ul className="list-disc pl-5">{evWo.unmetPrerequisites.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
