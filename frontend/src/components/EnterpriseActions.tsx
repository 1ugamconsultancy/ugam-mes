import React from 'react';
import { Pencil, Plus, Trash2, RotateCcw } from 'lucide-react';

export interface EnterpriseActionTarget { kind: 'organization' | 'plant'; id: string; name: string; restore: boolean }
export default function EnterpriseActions({kind, item, inheritedArchived = false, onEdit, onAdd, onArchive}: {
  kind: 'organization' | 'plant'; item: {id: string; name: string; archivedAt?: string | null}; inheritedArchived?: boolean;
  onEdit: () => void; onAdd: () => void; onArchive: (target: EnterpriseActionTarget) => void;
}) {
  const archived = Boolean(item.archivedAt);
  const actions = inheritedArchived ? [] : archived
    ? [{label:`Restore ${kind}: ${item.name}`, icon:RotateCcw, action:() => onArchive({kind,...item,restore:true}), danger:false}]
    : [{label:`Edit ${kind}: ${item.name}`,icon:Pencil,action:onEdit,danger:false},
      {label:`${kind === 'organization' ? 'Add plant to' : 'Add sibling plant beside'}: ${item.name}`,icon:Plus,action:onAdd,danger:false},
      {label:`Archive ${kind}: ${item.name}`,icon:Trash2,action:() => onArchive({kind,...item,restore:false}),danger:true}];
  return <span className="enterprise-actions inline-flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
    {actions.map(({label,icon:Icon,action,danger}) => <button key={label} type="button" title={label} aria-label={label} onClick={action} className={`enterprise-icon ${danger ? 'enterprise-icon-danger' : ''}`}><Icon size={16}/></button>)}
  </span>;
}
