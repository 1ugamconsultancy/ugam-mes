import React, { useEffect, useRef, useState } from 'react';
import EnterpriseActions, { EnterpriseActionTarget } from './EnterpriseActions';
import { Building2, Factory, ChevronRight, ChevronDown, Search, Plus, Pencil, Palette, ArrowLeft } from 'lucide-react';

export interface ExplorerOrganization { id: string; name: string; code: string; industryType: string; isActive: boolean; logoUrl?: string; archivedAt?: string | null }
export interface ExplorerPlant { id: string; name: string; code: string; organizationId: string; location?: string; timezone?: string; status: string; themeName?: string; archivedAt?: string | null; inheritedArchived?: boolean }
export type ExplorerSelection = { kind: 'organization' | 'plant'; id: string } | null;
interface Props {
  organizations: ExplorerOrganization[]; plants: ExplorerPlant[];
  showArchived?: boolean; onShowArchived?: (show: boolean) => void; onArchive?: (target: EnterpriseActionTarget) => void;
  selection: ExplorerSelection; onSelect: (value: ExplorerSelection) => void;
  onAddOrganization: () => void; onEditOrganization: (id: string) => void;
  onAddPlant: (organizationId: string) => void; onEditPlant: (id: string) => void; onTheme: (id: string) => void;
}
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500';
export default function EnterpriseExplorer(props: Props) {
  const { selection, onSelect } = props;
  const organizations = props.organizations.filter(o => props.showArchived || !o.archivedAt);
  const plants = props.plants.filter(p => props.showArchived || (!p.archivedAt && !p.inheritedArchived && !props.organizations.find(o => o.id === p.organizationId)?.archivedAt));
  const actions = (kind: 'organization' | 'plant', item: ExplorerOrganization | ExplorerPlant) => <EnterpriseActions kind={kind} item={item} inheritedArchived={kind === 'plant' && Boolean((item as ExplorerPlant).inheritedArchived || props.organizations.find(o => o.id === (item as ExplorerPlant).organizationId)?.archivedAt)} onArchive={target => props.onArchive?.(target)} onEdit={() => kind === 'organization' ? props.onEditOrganization(item.id) : props.onEditPlant(item.id)} onAdd={() => props.onAddPlant(kind === 'organization' ? item.id : organizations.some(o => o.id === (item as ExplorerPlant).organizationId) ? (item as ExplorerPlant).organizationId : '')}/>;
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mobileDetails, setMobileDetails] = useState(false);
  const [focused, setFocused] = useState('');
  const tree = useRef<HTMLDivElement>(null);
  const query = search.trim().toLocaleLowerCase();
  const matches = (item: {name: string; code: string}) => `${item.name} ${item.code}`.toLocaleLowerCase().includes(query);
  const orphanPlants = plants.filter(p => !organizations.some(o => o.id === p.organizationId));
  const groups = [...organizations.map(o => ({ id: o.id, name: o.name, code: o.code, org: o, children: plants.filter(p => p.organizationId === o.id) })),
    ...(orphanPlants.length ? [{ id: '__unassigned', name: 'Unassigned organization', code: '', org: undefined, children: orphanPlants }] : [])]
    .map(g => ({ ...g, children: query && !matches(g) ? g.children.filter(matches) : g.children }))
    .filter(g => !query || matches(g) || g.children.length);
  const isOpen = (id: string) => Boolean(query) || expanded[id] !== false;
  const rows = groups.flatMap(g => [{ key: `organization:${g.id}`, parent: '', group: g, plant: undefined as ExplorerPlant | undefined },
    ...(isOpen(g.id) ? g.children.map(plant => ({ key: `plant:${plant.id}`, parent: `organization:${g.id}`, group: g, plant })) : [])]);
  const selectedKey = selection ? `${selection.kind}:${selection.id}` : '';
  const tabKey = rows.some(r => r.key === focused) ? focused : rows.some(r => r.key === selectedKey) ? selectedKey : rows[0]?.key;
  const selectedPlant = selection?.kind === 'plant' ? plants.find(p => p.id === selection.id) : undefined;
  const selectedParent = selectedPlant ? (organizations.some(o => o.id === selectedPlant.organizationId) ? selectedPlant.organizationId : '__unassigned') : undefined;
  useEffect(() => {
    if (selectedParent) setExpanded(current => ({ ...current, [selectedParent]: true }));
    if (selection) setMobileDetails(true);
  }, [selectedKey, selectedParent]);
  const select = (value: ExplorerSelection) => { onSelect(value); setMobileDetails(true); };
  const focusRow = (key: string) => {
    setFocused(key);
    const node = Array.from(tree.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') || []).find(n => n.dataset.key === key);
    node?.focus();
  };
  const keyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.target !== event.currentTarget) return;
    const row = rows[index];
    if (!['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End','Enter',' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowDown') focusRow(rows[Math.min(index + 1, rows.length - 1)].key);
    if (event.key === 'ArrowUp') focusRow(rows[Math.max(index - 1, 0)].key);
    if (event.key === 'Home') focusRow(rows[0].key);
    if (event.key === 'End') focusRow(rows[rows.length - 1].key);
    if (event.key === 'ArrowRight' && !row.plant) {
      if (!isOpen(row.group.id)) setExpanded(s => ({ ...s, [row.group.id]: true }));
      else if (row.group.children.length) focusRow(`plant:${row.group.children[0].id}`);
    }
    if (event.key === 'ArrowLeft') {
      if (row.parent) focusRow(row.parent);
      else if (!query) setExpanded(s => ({ ...s, [row.group.id]: false }));
    }
    if (event.key === 'Enter' || event.key === ' ') select({kind: row.plant ? 'plant' : 'organization', id: row.plant?.id || row.group.id});
  };
  const org = selection?.kind === 'organization' ? organizations.find(o => o.id === selection.id) : undefined;
  const plant = selection?.kind === 'plant' ? plants.find(p => p.id === selection.id) : undefined;
  const children = org ? plants.filter(p => p.organizationId === org.id) : selection?.id === '__unassigned' ? orphanPlants : [];
  const fields = plant ? [['Code', plant.code], ['Organization', organizations.find(o => o.id === plant.organizationId)?.name || 'Unassigned organization'], ['Status', plant.status], ['Location', plant.location || 'Not specified'], ['Timezone', plant.timezone || 'Not specified'], ['Theme', plant.themeName || 'Not configured']]
    : org ? [['Code', org.code], ['Industry', org.industryType.replace(/_/g, ' ')], ['Status', org.isActive ? 'Active' : 'Inactive'], ['Logo URL', org.logoUrl || 'Not configured']] : [];
  return <div className="grid min-w-0 gap-4 lg:grid-cols-[360px_minmax(0,1fr)] text-slate-900 dark:text-slate-100">
    <section className={`${mobileDetails && selection ? 'hidden lg:block' : ''} rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden`} aria-label="Organization explorer">
      <div className="p-3 space-y-3 border-b border-slate-200 dark:border-slate-700">
        <button className={`${button} w-full`} onClick={props.onAddOrganization}><Plus size={16}/>Add Organization</button>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2"><Search size={16} className="shrink-0"/><input aria-label="Search organizations and plants" placeholder="Search name or code…" value={search} onChange={e => setSearch(e.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none"/></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(props.showArchived)} onChange={e => props.onShowArchived?.(e.target.checked)}/>Show archived</label>
        <p className="text-xs text-slate-500 dark:text-slate-400">{organizations.length} organizations · {plants.length} plants</p>
      </div>
      <div ref={tree} role="tree" aria-label="Organizations and plants" className="p-2 lg:max-h-[calc(100vh-300px)] overflow-y-auto">
        {rows.map((row, index) => <div key={row.key} role="treeitem" aria-level={row.plant ? 2 : 1} aria-expanded={row.plant ? undefined : isOpen(row.group.id)} aria-selected={selectedKey === row.key} tabIndex={tabKey === row.key ? 0 : -1} data-key={row.key}
          onFocus={() => setFocused(row.key)} onKeyDown={e => keyDown(e, index)} onClick={() => select({kind: row.plant ? 'plant' : 'organization', id: row.plant?.id || row.group.id})}
          className={`flex flex-wrap items-center gap-2 rounded-lg py-2 pr-2 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${row.plant ? 'pl-8' : 'pl-1'} ${selectedKey === row.key ? 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          {!row.plant && <button tabIndex={-1} aria-label={`${isOpen(row.group.id) ? 'Collapse' : 'Expand'} ${row.group.name}`} disabled={Boolean(query)} onClick={e => {e.stopPropagation(); setExpanded(s => ({...s, [row.group.id]: !isOpen(row.group.id)}));}} className="p-1 shrink-0">{isOpen(row.group.id) ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button>}
          {row.plant ? <Factory size={17} className="shrink-0 text-emerald-600"/> : <Building2 size={18} className="shrink-0 text-blue-600"/>}
          <span className="min-w-[100px] flex-1"><span className="block text-sm font-semibold break-words">{row.plant?.name || row.group.name}</span><span className="block text-xs text-slate-500 dark:text-slate-400 break-all">{row.plant?.code || row.group.code}</span></span>
          {(row.plant?.archivedAt || row.group.org?.archivedAt || row.plant?.inheritedArchived) && <span className="enterprise-badge">{row.group.org?.archivedAt && row.plant ? 'Parent archived' : 'Archived'}</span>}
          {row.plant ? actions('plant',row.plant) : row.group.org ? actions('organization',row.group.org) : null}
        </div>)}
        {!rows.length && <p className="p-4 text-sm text-slate-500">{query ? 'No matching organizations or plants.' : 'No organizations yet. Add an organization to get started.'}</p>}
      </div>
    </section>
    <section className={`${!mobileDetails ? 'hidden lg:block' : ''} min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6`} aria-label="Selected item details">
      <button className={`${button} lg:hidden mb-4`} onClick={() => setMobileDetails(false)}><ArrowLeft size={16}/>Organizations & Plants</button>
      {!selection ? <div className="py-16 text-center text-slate-500"><Building2 className="mx-auto mb-3" size={32}/><p>Select an organization or plant to view its details.</p></div> : <>
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{plant ? 'Plant / Facility' : 'Organization'}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 className="text-xl font-bold break-words min-w-0">{plant?.name || org?.name || 'Unassigned organization'}</h2>{plant ? actions('plant',plant) : org ? actions('organization',org) : null}</div>
        {(org?.archivedAt || plant?.archivedAt || plant?.inheritedArchived) && <p className="enterprise-badge mb-4">{plant?.inheritedArchived ? 'Suspended by archived organization. Restore the parent organization first.' : 'Archived � records and history are preserved.'}</p>}
        {plant && <div className="mb-4"><button className={button} disabled={Boolean(plant.archivedAt || plant.inheritedArchived)} onClick={() => props.onTheme(plant.id)}><Palette size={15}/>Customize Theme</button></div>}
        <dl className="grid gap-4 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 text-sm break-words">{value}</dd></div>)}</dl>
        {!plant && <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4"><h3 className="font-semibold mb-3">Plants & Facilities ({children.length})</h3>{children.map(p => <button key={p.id} className="flex w-full items-center gap-3 border-b border-slate-100 dark:border-slate-800 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-blue-500" onClick={() => select({kind:'plant',id:p.id})}><Factory size={18} className="shrink-0 text-emerald-600"/><span className="min-w-0 flex-1"><span className="block text-sm font-semibold break-words">{p.name}</span><span className="text-xs text-slate-500">{p.code} · {p.status}</span></span><ChevronRight size={16}/></button>)}{!children.length && <p className="text-sm text-slate-500">No plants assigned to this organization.</p>}</div>}
      </>}
    </section>
  </div>;
}
