import React, { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../config';
import { useShopfloorStore } from '../context/shopfloorStore';
import { useRuntimeMode } from '../hooks/useRuntimeMode';
import DataStatus from './DataStatus';

const display = (value: any) => value === null || value === undefined || value === '' ? 'Unavailable' : String(value);
const control = 'rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2 disabled:opacity-60';
export async function operationalRequest(token: string, path: string, signal: AbortSignal, body?: unknown) {
  const controller=new AbortController();
  const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted)controller.abort();
  const timeout=setTimeout(abort,15000);
  try {
  const response = await fetch(getApiUrl(path), {signal:controller.signal,method:body===undefined?'GET':'PATCH',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(response.status===401) useShopfloorStore.getState().logout();
  const data = await response.json().catch(()=>null);
  if(!response.ok) throw Error(typeof data?.message==='string'?data.message:`Request failed (${response.status})`);
  return data;
  } finally {clearTimeout(timeout);signal.removeEventListener('abort',abort);}
}

// No network writes exist in the demonstration component.
function Demonstration() {
  const [running,setRunning]=useState(false);
  return <section className="industrial-card p-4 space-y-3 border-amber-500 border">
    <strong>SIMULATED · Demonstration only · Never production evidence</strong>
    <p>Illustrative machine · Good: 120 · Scrap: 2 · Temperature: 22 °C</p>
    <button className={control} onClick={()=>setRunning(v=>!v)}>{running?'Pause illustration':'Start illustration'}</button>
    <p>Illustrative step: {running?'Running':'Paused'}. Scans and signatures are unavailable; no records are written.</p>
  </section>;
}

export default function OperationalDisplay({operator=false}:{operator?:boolean}) {
  const token=useShopfloorStore(s=>s.token);
  const runtime=useRuntimeMode();
  // Session-keyed subtree prevents previous-session values or pending controls from appearing.
  if(!token) return null;
  return <div className="space-y-4"><h1 className="text-xl font-bold">{operator?'Operator station':'Equipment monitoring'}</h1>
    {runtime.error&&<p role="alert">{runtime.error}</p>}
    {!runtime.mode&&!runtime.error&&<p role="status">Checking runtime mode…</p>}
    {runtime.mode==='demo'&&<Demonstration key={token}/>}
    <RecordedDisplay key={token} token={token} operator={operator} canWrite={runtime.mode==='production'}/>
  </div>;
}

function RecordedDisplay({token,operator,canWrite}:{token:string;operator:boolean;canWrite:boolean}) {
  const role=useShopfloorStore(s=>s.user?.role);
  const [machines,setMachines]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([]);
  const [error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(''),[detail,setDetail]=useState<any>(null),[detailError,setDetailError]=useState('');
  const [pending,setPending]=useState<string|null>(null),[writeError,setWriteError]=useState('');
  const lifetime=useRef(new AbortController()),read=useRef<AbortController|null>(null),busy=useRef(false);
  const load=async()=>{
    read.current?.abort(); const controller=new AbortController();read.current=controller;
    setLoading(true);
    try {
      const [m,o]=await Promise.all([operationalRequest(token,'/equipment/status',controller.signal),operator?operationalRequest(token,'/work-orders',controller.signal):Promise.resolve([])]);
      if(!Array.isArray(m)||!Array.isArray(o))throw Error('Invalid recorded-data response');
      if(controller.signal.aborted||lifetime.current.signal.aborted)return;
      setMachines(m);setOrders(o);setError('');
      setSelected(old=>o.some((x:any)=>x.id===old)?old:'');
    } catch(e:any) {if(!controller.signal.aborted&&!lifetime.current.signal.aborted)setError(e.message||'Refresh failed');}
    finally {if(!controller.signal.aborted&&!lifetime.current.signal.aborted)setLoading(false);}
  };
  useEffect(()=>{
    lifetime.current=new AbortController();void load();
    const timer=setInterval(()=>{if(!document.hidden&&!busy.current)void load();},30000);
    return()=>{lifetime.current.abort();read.current?.abort();clearInterval(timer);};
  },[token]);
  useEffect(()=>{
    const controller=new AbortController();setDetail(null);setDetailError('');
    if(selected) operationalRequest(token,`/work-orders/${selected}`,controller.signal).then(d=>{if(!controller.signal.aborted)setDetail(d);})
      .catch(e=>{if(!controller.signal.aborted)setDetailError(e.message);});
    return()=>controller.abort();
  },[selected,token,orders]);
  const change=async(id:string,status:string)=>{
    if(busy.current||!canWrite)return;
    busy.current=true;setPending(id);setWriteError('');read.current?.abort();
    const signal=lifetime.current.signal;
    try {
      const saved=await operationalRequest(token,`/plants/machines/${id}/status`,signal,{status});
      if(signal.aborted)return;
      if(saved?.id!==id||saved?.status!==status)throw Error('Status confirmation unavailable');
      setMachines(rows=>rows.map(m=>m.id===id?{...m,status:saved.status,statusProvenance:{sourceKind:'RECORDED',availability:'AVAILABLE',observedAt:saved.lastStatusChange,sourceReferences:[id]}}:m));
      await load();
    } catch(e:any) {
      if(!signal.aborted){setWriteError(`${e.message}. Status was not confirmed; refreshing recorded state before retry.`);await load();}
    } finally {if(!signal.aborted){busy.current=false;setPending(null);}}
  };
  const order=orders.find(o=>o.id===selected);
  const snapshot=detail?.id===selected ? detail.releasedRecipe : null;
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3 items-center"><h2 className="font-semibold">Recorded equipment</h2><button className={control} disabled={loading||!!pending} onClick={()=>void load()}>{loading?'Refreshing…':'Refresh / retry'}</button></div>
    {error&&<p role="alert">{error}. Previous records, if shown, are stale.</p>}
    {writeError&&<p role="alert">{writeError}</p>}
    {!loading&&!error&&!machines.length&&<p>No equipment recorded for this plant.</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{machines.map(m=><section key={m.id} className="industrial-card p-4 space-y-3 min-w-0 break-words">
      <h3 className="font-semibold">{m.code} · {m.name}</h3><p>Recorded status: {display(m.status)}</p>
      <DataStatus data={m.statusProvenance} error={error}/>
      <p>Recorded lifetime totals · Good: {display(m.produced)} · Scrap: {display(m.scrap)}</p>
      <DataStatus data={m.countProvenance} error={error}/>
      <p>OEE: Unavailable — recorded runtime, scheduled period and ideal cycle rate are required.</p>
      <p>Calibration: {display(m.calibrationStatus)} · Qualification: {display(m.qualificationType)}</p>
      <label className="flex flex-col gap-1">Change recorded machine status
        <select className={control} aria-label={`Status for ${m.code}`} value={m.status??''}
          disabled={!canWrite||!!pending||!!error||!['OPERATOR','SUPERVISOR','ADMIN','SUPER_ADMIN'].includes(role||'')}
          onChange={e=>void change(m.id,e.target.value)}>
          <option value="" disabled>Unavailable</option>{['RUNNING','IDLE','BREAKDOWN','SETUP','MAINTENANCE'].map(s=><option key={s}>{s}</option>)}
        </select></label>{pending===m.id&&<p role="status">Awaiting server confirmation…</p>}
    </section>)}</div>
    {operator&&<section className="industrial-card p-4 space-y-4">
      <h2 className="font-semibold">Recorded work order</h2>
      <label className="flex flex-col gap-1">Select order<select className={control} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select a recorded order</option>{orders.map(o=><option key={o.id} value={o.id}>{o.woNumber} · {o.status}</option>)}</select></label>
      {!loading&&!error&&!orders.length&&<p>No work orders recorded for this plant.</p>}
      {order&&<p>Target: {display(order.targetQuantity)} · Recorded good: {display(order.completedQuantity)} · Scrap: {display(order.scrapQuantity)} · Status: {display(order.status)}</p>}
      {detailError&&<p role="alert">{detailError}. Instructions unavailable.</p>}
      <h3 className="font-semibold">Released recipe instructions</h3>
      {snapshot && snapshot.id===detail?.recipeId?<><p>{snapshot.code} · Version {snapshot.version}</p><pre className="whitespace-pre-wrap break-words text-sm">{typeof snapshot.instructions==='string'?snapshot.instructions:JSON.stringify(snapshot.instructions,null,2)}</pre></>:<p>Instructions unavailable: select an order with a released recipe snapshot.</p>}
      <p>Sensor readings and elapsed execution time: unavailable. No recorded telemetry or execution timer is linked to this view.</p>
      <div className="flex flex-wrap gap-2">{['Start / pause step','Verify component scan','Sign off step'].map(label=><button key={label} disabled className={control} title="Unavailable: backend evidence support is required">{label}</button>)}</div>
      <p>These step controls are disabled because execution, scan verification, and step signatures are not supported by recorded backend evidence here. Use Work Orders for supported workflow actions.</p>
    </section>}
  </div>;
}

