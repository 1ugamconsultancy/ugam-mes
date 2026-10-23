import React, { useState, useEffect } from 'react';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getApiUrl } from '../config';
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
  X
} from 'lucide-react';

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
  status: 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
}

export default function WorkOrders() {
  const { token, user } = useShopfloorStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED'>('ALL');

  const filteredWorkOrders = statusFilter === 'ALL'
    ? workOrders
    : workOrders.filter(w => w.status === statusFilter);

  // Modals and inputs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWoNumber, setNewWoNumber] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newQty, setNewQty] = useState(1000);
  const [productsList, setProductsList] = useState<{ id: string; sku: string; name: string }[]>([]);
  
  // Electronic Signature state
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPassword, setSignPassword] = useState('');
  const [signatureMeaning, setSignatureMeaning] = useState('');
  const [activeWoId, setActiveWoId] = useState<string | null>(null);
  const [nextStatusTarget, setNextStatusTarget] = useState<WorkOrder['status'] | null>(null);
  const [signError, setSignError] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await fetch(getApiUrl('/recipes/products'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProductsList(data);
        if (data.length > 0 && !newSku) {
          setNewSku(data[0].sku);
        }
      }
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
        const formatted = data.map((item: any) => ({
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
        }));
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
    try {
      const response = await fetch(getApiUrl('/work-orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          woNumber: newWoNumber,
          productSku: newSku,
          targetQuantity: newQty,
          plannedStart: new Date().toISOString(),
          plannedEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          status: 'PLANNED'
        })
      });
      if (response.ok) {
        setShowCreateModal(false);
        setNewWoNumber('');
        fetchWorkOrders();
      } else {
        alert('Failed to create batch record');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating batch record');
    }
  };

  // Launch Electronic Signature verification modal before status change
  const triggerStatusChangeSignature = (woId: string, currentStatus: WorkOrder['status'], nextStatus: WorkOrder['status']) => {
    let meaning = '';
    switch (nextStatus) {
      case 'RELEASED':
        meaning = `Release MBR for production (Batch ${woId.substring(0,8)})`;
        break;
      case 'IN_PROGRESS':
        meaning = `Authorize campaign start & material dispensing for Batch ${woId.substring(0,8)}`;
        break;
      case 'COMPLETED':
        meaning = `Verify blend completion & compress final yields for Batch ${woId.substring(0,8)}`;
        break;
      case 'CLOSED':
        meaning = `QA Release & Close Electronic Batch Record dossier for Batch ${woId.substring(0,8)}`;
        break;
      default:
        meaning = `Status transition to ${nextStatus}`;
    }

    setActiveWoId(woId);
    setNextStatusTarget(nextStatus);
    setSignatureMeaning(meaning);
    setSignPassword('');
    setSignError('');
    setShowSignModal(true);
  };

  const handleSignAndConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWoId || !nextStatusTarget) return;

    setIsSigning(true);
    setSignError('');

    try {
      // 1. Electronic signature re-verification
      const signRes = await fetch(getApiUrl('/compliance/sign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: signPassword,
          meaning: signatureMeaning
        })
      });

      if (!signRes.ok) {
        const errData = await signRes.json();
        setSignError(errData.message || 'Verification failed. Incorrect password.');
        setIsSigning(false);
        return;
      }

      // 2. Perform EBR approval if closing/releasing QA dossier
      if (nextStatusTarget === 'CLOSED') {
        const approveEbrRes = await fetch(getApiUrl(`/ebr/${activeWoId}/approve`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            meaning: signatureMeaning
          })
        });

        if (!approveEbrRes.ok) {
          throw new Error('EBR Dossier approval failed');
        }
      }

      // 3. Update status in database
      const updateRes = await fetch(getApiUrl(`/work-orders/${activeWoId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: nextStatusTarget
        })
      });

      if (updateRes.ok) {
        setShowSignModal(false);
        fetchWorkOrders();
      } else {
        setSignError('Failed to update status on the server.');
      }
    } catch (err) {
      console.error(err);
      setSignError('Server error while saving signature.');
    } finally {
      setIsSigning(false);
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
        alert('Failed to generate EBR PDF');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching EBR PDF');
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
        {user?.role !== 'OPERATOR' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} /> Initiate MBR Campaign
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
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <ClipboardList size={15} className={statusFilter === 'ALL' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>All Batches</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            statusFilter === 'ALL'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {workOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PLANNED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'PLANNED'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <span>Planned</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            statusFilter === 'PLANNED'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {workOrders.filter(w => w.status === 'PLANNED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('RELEASED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'RELEASED'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <span>Released</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            statusFilter === 'RELEASED'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {workOrders.filter(w => w.status === 'RELEASED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <span>In Progress</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {workOrders.filter(w => w.status === 'IN_PROGRESS').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'COMPLETED'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <span>Completed</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            statusFilter === 'COMPLETED'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {workOrders.filter(w => w.status === 'COMPLETED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CLOSED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            statusFilter === 'CLOSED'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <span>Closed</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            statusFilter === 'CLOSED'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {workOrders.filter(w => w.status === 'CLOSED').length}
          </span>
        </button>
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
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${statusBadges[wo.status]}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2.5">
                        {wo.status === 'PLANNED' && (
                          <button
                            onClick={() => triggerStatusChangeSignature(wo.id, 'PLANNED', 'RELEASED')}
                            className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7C] text-slate-700 dark:text-slate-300 hover:text-white rounded border border-slate-300 dark:border-slate-700 transition text-xs font-bold cursor-pointer active:scale-95"
                            title="Sign and Release Batch"
                          >
                            <Play size={12} /> Release
                          </button>
                        )}
                        {wo.status === 'RELEASED' && (
                          <button
                            onClick={() => triggerStatusChangeSignature(wo.id, 'RELEASED', 'IN_PROGRESS')}
                            className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7C] text-slate-700 dark:text-slate-300 hover:text-white rounded border border-slate-300 dark:border-slate-700 transition text-xs font-bold cursor-pointer active:scale-95"
                            title="Sign and Start Production Campaign"
                          >
                            <Play size={12} /> Start Run
                          </button>
                        )}
                        {wo.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => triggerStatusChangeSignature(wo.id, 'IN_PROGRESS', 'COMPLETED')}
                            className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7C] text-slate-700 dark:text-slate-300 hover:text-white rounded border border-slate-300 dark:border-slate-700 transition text-xs font-bold cursor-pointer active:scale-95"
                            title="Complete Batch Campaign"
                          >
                            <CheckCircle2 size={12} /> Complete
                          </button>
                        )}
                        {wo.status === 'COMPLETED' && (
                          <button
                            onClick={() => triggerStatusChangeSignature(wo.id, 'COMPLETED', 'CLOSED')}
                            className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7C] text-slate-700 dark:text-slate-300 hover:text-white rounded border border-slate-300 dark:border-slate-700 transition text-xs font-bold cursor-pointer active:scale-95"
                            title="QA Signoff Batch Release"
                          >
                            <Check size={12} /> QA Release
                          </button>
                        )}

                        {/* EBR Dossier PDF download */}
                        {(wo.status === 'COMPLETED' || wo.status === 'CLOSED' || wo.status === 'IN_PROGRESS') && (
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
              <h3 className="text-lg font-bold dark:text-white text-slate-900">Initiate MBR Batch Campaign</h3>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Batch Record Number</label>
                <input
                  type="text"
                  required
                  value={newWoNumber}
                  onChange={(e) => setNewWoNumber(e.target.value)}
                  placeholder="e.g. BATCH-2026-0003"
                  className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Product Formula / Master Recipe</label>
                <select
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800"
                >
                  {productsList.length > 0 ? (
                    productsList.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.name} ({p.sku})
                      </option>
                    ))
                  ) : (
                    <option value="FG-001">Automotive Control Pin (FG-001)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Quantity (PCS)</label>
                <input
                  type="number"
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-blue-600/10"
                >
                  Save Batch MBR
                </button>
              </div>
            </form>
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
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Electronic Signature Verification</h3>
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

            <form onSubmit={handleSignAndConfirm} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-300">Signature Operator:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{user?.name || user?.username}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-300">Role Profile:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-300">{user?.role}</span>
                </div>
                <div className="border-t dark:border-slate-800/80 pt-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-300 block font-semibold mb-0.5">Signature Intent / Meaning:</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-950 p-1.5 rounded block text-[11px] leading-tight">
                    {signatureMeaning}
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1.5">Re-enter Password to Authenticate</label>
                <input
                  type="password"
                  required
                  value={signPassword}
                  onChange={(e) => setSignPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSigning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/10"
                >
                  {isSigning ? 'Signing...' : 'Submit E-Signature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
