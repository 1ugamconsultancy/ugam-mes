import React, { useState } from 'react';
import { Building2, Factory, Users, Search, Plus, Palette, ChevronDown, ArrowRight } from 'lucide-react';
import EnterpriseActions, { EnterpriseActionTarget } from './EnterpriseActions';
import { ExplorerOrganization, ExplorerPlant, ExplorerSelection } from './EnterpriseExplorer';

interface User { id: string; username: string; email: string; role: string; firstName?: string; lastName?: string; organizationId?: string; plantId?: string; assignmentArchived?: boolean }
interface Props {
  organizations: ExplorerOrganization[]; plants: ExplorerPlant[]; users: User[];
  selection: ExplorerSelection; onSelect: (selection: ExplorerSelection) => void;
  showArchived: boolean; onShowArchived: (show: boolean) => void;
  onArchive: (target: EnterpriseActionTarget) => void;
  onEditOrganization: (id: string) => void; onAddPlant: (id: string) => void;
  onEditPlant: (id: string) => void; onTheme: (id: string) => void;
  onEditUser: (user: User) => void;
}
export default function EnterpriseOrganizationWorkspace(p: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const suspended = (plant: ExplorerPlant) => !!(plant.inheritedArchived || p.organizations.find(o => o.id === plant.organizationId)?.archivedAt);
  const plants = p.plants.filter(plant => p.showArchived || (!plant.archivedAt && !suspended(plant)));
  const organizations = p.organizations.filter(o => p.showArchived || !o.archivedAt);
  const orphans = plants.filter(plant => !p.organizations.some(o => o.id === plant.organizationId));
  const groups = [...organizations.map(org => ({id: org.id, name: org.name, code: org.code, org, plants: plants.filter(plant => plant.organizationId === org.id)})), ...(orphans.length ? [{id: '__unassigned', name: 'Unassigned organization', code: '', org: undefined, plants: orphans}] : [])];
  const query = search.toLowerCase().trim();
  const visible = groups.filter(g => `${g.name} ${g.code} ${g.plants.map(plant => `${plant.name} ${plant.code}`).join(' ')}`.toLowerCase().includes(query));
  const selectedPlant = p.selection?.kind === 'plant' ? p.plants.find(plant => plant.id === p.selection?.id) : undefined;
  const selectedId = selectedPlant ? groups.find(g => g.plants.some(plant => plant.id === selectedPlant.id))?.id : p.selection?.id;
  const group = visible.find(g => g.id === selectedId) || visible[0];
  const status = (org: ExplorerOrganization) => org.archivedAt ? 'Archived' : org.isActive ? 'Active' : 'Inactive';
  const actions = (kind: 'organization' | 'plant', item: ExplorerOrganization | ExplorerPlant) => <EnterpriseActions kind={kind} item={item} inheritedArchived={kind === 'plant' && suspended(item as ExplorerPlant)} onArchive={p.onArchive} onEdit={() => kind === 'organization' ? p.onEditOrganization(item.id) : p.onEditPlant(item.id)} onAdd={() => p.onAddPlant(kind === 'organization' ? item.id : organizations.find(o => o.id === (item as ExplorerPlant).organizationId)?.id || '')}/>;
  const section = (id: string, title: string, icon: React.ReactNode, count: string, content: React.ReactNode) => <section className="enterprise-accordion" key={id}>
    <button className="enterprise-accordion-heading" aria-expanded={!collapsed[id]} aria-controls={`section-${id}`} onClick={() => setCollapsed(current => ({...current, [id]: !current[id]}))}>
      <span className="enterprise-workspace-icon">{icon}</span><span className="flex-1 text-left font-bold">{title}</span><span className="enterprise-count">{count}</span><ChevronDown size={17} className={collapsed[id] ? '-rotate-90 shrink-0' : 'shrink-0'}/>
    </button><div id={`section-${id}`} hidden={!!collapsed[id]} className="p-4">{content}</div>
  </section>;
  const userList = (users: User[]) => users.length ? <div className="enterprise-user-list">{users.map(user => <div key={user.id} className="enterprise-user-row"><div className="min-w-0 flex-1"><strong className="block break-words">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username}</strong><span className="text-xs text-slate-500 dark:text-slate-400 break-all">{user.username} · {user.email}</span>{user.assignmentArchived && <span className="enterprise-badge block w-fit">Assignment archived / suspended</span>}</div><span className="enterprise-count">{user.role.replace(/_/g, ' ')}</span><button className="enterprise-secondary" aria-label={`Reallocate ${user.username}`} onClick={() => p.onEditUser({...user})}>Reallocate <ArrowRight size={14}/></button></div>)}</div> : <p className="text-sm text-slate-500">No users assigned.</p>;
  const unassigned = p.users.filter(user => !user.plantId || !p.plants.some(plant => plant.id === user.plantId));
  return <div className="enterprise-workspace">
    <aside className="enterprise-workspace-list" aria-label="Organization list">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700"><Building2 size={20}/><h2 className="font-bold flex-1">Organizations</h2><span className="enterprise-count">{organizations.length} Listed</span></div>
      <label className="enterprise-search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search organizations and plants" placeholder="Search organizations or plants…"/></label>
      <label className="flex gap-2 items-center text-xs mb-3"><input type="checkbox" checked={p.showArchived} onChange={e => p.onShowArchived(e.target.checked)}/>Show archived</label>
      <div className="space-y-3">{visible.map(g => <article key={g.id} className={`enterprise-org-card ${group?.id === g.id ? 'is-selected' : ''}`}>
        <button className="enterprise-org-select" aria-pressed={group?.id === g.id} onClick={() => p.onSelect({kind:'organization',id:g.id})}><span className="enterprise-workspace-icon"><Building2 size={24}/></span><span className="min-w-0 flex-1 text-left"><span className="block text-xs font-mono text-blue-800 dark:text-blue-300">{g.code}</span><strong className="block break-words">{g.name}</strong><span className="text-xs text-slate-500 dark:text-slate-400">{g.plants.length} plants</span></span><ArrowRight size={17} className="shrink-0"/></button>
        {g.org && <div className="flex justify-between items-center gap-2 mt-2"><span className="enterprise-count">{status(g.org)}</span>{actions('organization',g.org)}</div>}
      </article>)}{!visible.length && <p className="text-sm text-slate-500 py-6">{query ? 'No matching organizations or plants.' : 'No organizations yet. Create an organization to get started.'}</p>}</div>
    </aside>
    <main className="enterprise-workspace-details" aria-label="Organization plants and users">
      {group && <><header className="flex flex-wrap gap-3 items-center pb-4 border-b border-slate-200 dark:border-slate-700"><span className="enterprise-workspace-icon"><Building2 size={26}/></span><div className="flex-1 min-w-0"><span className="text-xs font-mono text-blue-800 dark:text-blue-300">{group.code}</span><h2 className="text-lg font-bold break-words">{group.name}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{group.org?.industryType.replace(/_/g,' ')} {group.org && `· ${status(group.org)}`}</p></div>{group.org && actions('organization',group.org)}</header>
      <div className="flex flex-wrap items-center justify-between gap-3 my-4"><h3 className="font-bold">Plants & Facilities <span className="enterprise-count">{group.plants.length}</span></h3><div className="flex flex-wrap gap-2"><button className="enterprise-secondary" onClick={() => setCollapsed({})}>Expand all</button><button className="enterprise-secondary" onClick={() => setCollapsed(Object.fromEntries([...p.plants.flatMap(plant => [`plant-${plant.id}`,`users-${plant.id}`]),'unassigned-users'].map(id => [id,true])))}>Collapse all</button>{group.org && !group.org.archivedAt && <button className="enterprise-primary" onClick={() => p.onAddPlant(group.id)}><Plus size={16}/>Add New Plant</button>}</div></div>
      {!group.plants.length && <p className="text-sm text-slate-500 py-6">No plants in this organization.</p>}
      {group.plants.map(plant => <article key={plant.id} className="enterprise-plant-group" aria-label={plant.name}>
        {section(`plant-${plant.id}`,plant.name,<Factory size={20}/>,plant.archivedAt ? 'Archived' : suspended(plant) ? 'Parent archived' : plant.status,<><div className="flex flex-wrap gap-3 items-center justify-between mb-4"><span className="font-mono text-sm text-blue-800 dark:text-blue-300">{plant.code}</span><div className="flex flex-wrap gap-2">{actions('plant',plant)}{!plant.archivedAt && !suspended(plant) && <button className="enterprise-secondary" onClick={() => p.onTheme(plant.id)}><Palette size={15}/>Customize Theme</button>}</div></div><dl className="grid sm:grid-cols-3 gap-4 text-sm">{[['Location',plant.location],['Timezone',plant.timezone],['Theme',plant.themeName]].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</dt><dd className="break-words">{value || 'Not configured'}</dd></div>)}</dl>{suspended(plant) && <p className="enterprise-badge mt-3">Restore the parent organization before changing this plant.</p>}</>)}
        {section(`users-${plant.id}`,`Users · ${plant.name}`,<Users size={20}/>,`${p.users.filter(user => user.plantId === plant.id).length} users`,<>{!plant.archivedAt && !suspended(plant) && <label className="block text-xs font-semibold mb-4">Assign existing user<select aria-label={`Assign existing user to ${plant.name}`} className="block w-full mt-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 text-sm" value="" onChange={e => {const user=p.users.find(u => u.id===e.target.value); if(user) p.onEditUser({...user,organizationId:group.org?.id || '',plantId:plant.id});}}><option value="">Choose a user to review their allocation…</option>{p.users.filter(user => user.plantId !== plant.id).map(user => <option key={user.id} value={user.id}>{user.username} · {user.role}</option>)}</select></label>}{userList(p.users.filter(user => user.plantId === plant.id))}</>)}
      </article>)}</>}
      {section('unassigned-users','Enterprise & unassigned users',<Users size={20}/>,`${unassigned.length} users`,<><p className="text-xs text-slate-500 mb-3">Users without a valid plant assignment. Reallocate to assign an organization and plant.</p>{userList(unassigned)}</>)}
    </main>
  </div>;
}
