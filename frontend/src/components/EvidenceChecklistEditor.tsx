import { useEffect, useState } from 'react';
import { ListChecks, Plus, Trash2, ArrowUp, ArrowDown, Save, AlertTriangle } from 'lucide-react';
import { getApiUrl } from '../config';
import { toast } from '../context/toastStore';

export interface ChecklistItem {
  id: string;
  phase: 'PRE_START' | 'EXECUTION';
  kind: 'MANUAL' | 'MATERIAL' | 'QUALITY' | 'PRODUCTION' | 'WEIGHING' | 'VERIFIER';
  label: string;
  allowNotApplicable?: boolean;
}

interface Props {
  recipe: { id: string; recipeCode: string; version: string; status: string; evidenceRequirements?: any };
  token: string | null;
  canEdit: boolean;
  onSaved: (newRecipeId: string) => void;
}

const KINDS: { value: ChecklistItem['kind']; label: string }[] = [
  { value: 'MANUAL', label: 'Manual record (note)' },
  { value: 'MATERIAL', label: 'Materials dispensed' },
  { value: 'QUALITY', label: 'Passed quality check' },
  { value: 'PRODUCTION', label: 'Verified production count' },
  { value: 'WEIGHING', label: 'Weighing with scale ID' },
  { value: 'VERIFIER', label: 'Second-person verification' },
];

// Generic starter that only uses manual records, so it can never block on data a plant doesn't collect.
const TEMPLATE: ChecklistItem[] = [
  { id: 'PRE-CLEARANCE', phase: 'PRE_START', kind: 'MANUAL', label: 'Line and equipment clearance / cleanliness verified' },
  { id: 'PRE-MATERIALS', phase: 'PRE_START', kind: 'MANUAL', label: 'Materials and lots checked against the recipe' },
  { id: 'EXEC-IN-PROCESS', phase: 'EXECUTION', kind: 'MANUAL', label: 'In-process checks recorded within limits' },
  { id: 'EXEC-FINAL-QC', phase: 'EXECUTION', kind: 'MANUAL', label: 'Final quality check completed' },
  { id: 'EXEC-REVIEW-READY', phase: 'EXECUTION', kind: 'MANUAL', label: 'Batch record checked for completeness' },
];

const toItems = (raw: any): ChecklistItem[] => (Array.isArray(raw) ? raw.map((r: any) => ({
  id: String(r.id ?? ''),
  phase: r.phase === 'EXECUTION' ? 'EXECUTION' : 'PRE_START',
  kind: KINDS.some((k) => k.value === r.kind) ? r.kind : 'MANUAL',
  label: String(r.label ?? ''),
  allowNotApplicable: r.allowNotApplicable === true,
})) : []);

export default function EvidenceChecklistEditor({ recipe, token, canEdit, onSaved }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(toItems(recipe.evidenceRequirements));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(toItems(recipe.evidenceRequirements));
    setError('');
  }, [recipe.id, recipe.evidenceRequirements]);

  const hasChecklist = Array.isArray(recipe.evidenceRequirements) && recipe.evidenceRequirements.length > 0;
  const editable = canEdit && recipe.status === 'ACTIVE';
  const dirty = JSON.stringify(items) !== JSON.stringify(toItems(recipe.evidenceRequirements));

  const update = (i: number, patch: Partial<ChecklistItem>) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: number) => setItems((p) => {
    const j = i + d;
    if (j < 0 || j >= p.length) return p;
    const c = [...p];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });

  const validate = (): string => {
    if (!items.length) return 'Add at least one checklist item';
    const seen = new Set<string>();
    for (const it of items) {
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(it.id)) return `Invalid id "${it.id}" (letters, numbers, - and _ only, up to 80 characters)`;
      if (seen.has(it.id)) return `Duplicate id "${it.id}"`;
      seen.add(it.id);
      if (!it.label.trim()) return `Item "${it.id}" needs a description`;
    }
    return '';
  };

  const save = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(getApiUrl(`/recipes/${recipe.id}/evidence-revision`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requirements: items.map((it) => ({ ...it, label: it.label.trim(), allowNotApplicable: it.allowNotApplicable === true })) }),
      });
      if (res.ok) {
        const created = await res.json();
        toast.success(`Checklist saved as revision ${created.version}`);
        onSaved(created.id);
      } else {
        const err = await res.json().catch(() => null);
        setError(typeof err?.message === 'string' ? err.message : 'Could not save the checklist');
      }
    } catch {
      setError('Server error while saving the checklist');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'bg-white dark:bg-[#0D1B2A] border dark:border-[#1F3A5C] rounded p-1.5 text-xs dark:text-white focus:outline-none focus:border-blue-500';

  return (
    <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><ListChecks size={15} /></div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Batch Evidence Checklist</h4>
            <p className="text-[10px] text-slate-400">Evidence required before start and before completion. Needed to release a batch.</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${hasChecklist ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
          {hasChecklist ? `${recipe.evidenceRequirements.length} items` : 'Not set - batches cannot be released'}
        </span>
      </button>

      {open && (
        <div className="p-3 space-y-3 border-t dark:border-[#1F3A5C]">
          {!editable && (
            <div className="text-[11px] text-slate-500">
              {recipe.status !== 'ACTIVE' ? 'Only the active revision can be edited.' : 'Only a Production Manager or Admin can edit the checklist.'}
            </div>
          )}

          {items.length === 0 && <div className="text-xs text-slate-500">No checklist items yet.</div>}

          {items.map((it, i) => (
            <div key={i} className="rounded-lg border dark:border-[#1F3A5C] bg-white/60 dark:bg-[#0D1B2A]/40 p-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input disabled={!editable} value={it.id} onChange={(e) => update(i, { id: e.target.value })} placeholder="ID" className={`${inputCls} w-44 font-mono`} />
                <select disabled={!editable} value={it.phase} onChange={(e) => update(i, { phase: e.target.value as ChecklistItem['phase'] })} className={`${inputCls} w-36`}>
                  <option value="PRE_START">Before start</option>
                  <option value="EXECUTION">Execution</option>
                </select>
                <select disabled={!editable} value={it.kind} onChange={(e) => update(i, { kind: e.target.value as ChecklistItem['kind'] })} className={`${inputCls} w-52`}>
                  {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[11px] text-slate-500" title="Allow a supervisor to waive this item with a signature">
                  <input type="checkbox" disabled={!editable} checked={it.allowNotApplicable === true} onChange={(e) => update(i, { allowNotApplicable: e.target.checked })} /> Can be waived (N/A)
                </label>
                {editable && (
                  <div className="ml-auto flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} className="p-1 text-slate-400 hover:text-slate-700" title="Move up"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => move(i, 1)} className="p-1 text-slate-400 hover:text-slate-700" title="Move down"><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="p-1 text-red-400 hover:text-red-600" title="Remove"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <input disabled={!editable} value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="What must be verified or recorded" className={`${inputCls} w-full`} />
            </div>
          ))}

          {error && <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs font-semibold flex items-center gap-1.5"><AlertTriangle size={13} /> {error}</div>}

          {editable && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" onClick={() => setItems((p) => [...p, { id: `ITEM-${p.length + 1}`, phase: 'EXECUTION', kind: 'MANUAL', label: '' }])} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border dark:border-[#1F3A5C] rounded hover:bg-slate-100 dark:hover:bg-[#102237]"><Plus size={13} /> Add item</button>
              <button type="button" onClick={() => { if (!items.length || window.confirm('Replace the current items with the starter template?')) setItems(TEMPLATE.map((t) => ({ ...t }))); }} className="px-2.5 py-1.5 text-xs font-bold border dark:border-[#1F3A5C] rounded hover:bg-slate-100 dark:hover:bg-[#102237]">Start from template</button>
              <button type="button" disabled={saving || !dirty} onClick={save} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded"><Save size={13} /> {saving ? 'Saving...' : 'Save as new revision'}</button>
            </div>
          )}
          {editable && <div className="text-[10px] text-slate-400">Saving creates a new recipe revision and supersedes the current one. Batches already released keep the checklist they were released with.</div>}
        </div>
      )}
    </div>
  );
}
