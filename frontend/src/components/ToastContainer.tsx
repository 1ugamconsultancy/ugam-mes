import React from 'react';
import { useToastStore, ToastItem } from '../context/toastStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastMessage({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />,
    error: <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />,
    info: <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />,
  };

  const borders = {
    success: 'border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800',
    error: 'border-l-4 border-l-red-500 border-slate-200 dark:border-slate-800',
    warning: 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800',
    info: 'border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-800',
  };

  return (
    <div
      role="alert"
      className={`pointer-events-auto bg-white dark:bg-[#142A45] border ${borders[toast.type]} rounded-xl shadow-xl p-3.5 flex items-start justify-between gap-3 animate-slideInRight text-left transition-all`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {icons[toast.type]}
        <div className="min-w-0">
          {toast.title && (
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {toast.title}
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer shrink-0"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
