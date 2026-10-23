import React,{useEffect,useState} from 'react';
export default function DataStatus({data,error}:{data?:any,error?:string}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(t);},[]);
 const stale=data?.observedAt&& !data?.reportingPeriod && now-Date.parse(data.observedAt)>(data.staleAfterSeconds??300)*1000;
 const status=error?(data?'STALE':'UNAVAILABLE'):stale?'STALE':data?.availability||'UNAVAILABLE';
 return <div className="rounded border border-slate-300 p-2 text-sm" role="status"><strong>{data?.sourceKind==='SIMULATED'?'SIMULATED':data?.sourceKind==='DERIVED'?'CALCULATED FROM RECORDS':data?.sourceKind==='RECORDED'?'RECORDED':'SOURCE UNAVAILABLE'} · {status}</strong>{data?.observedAt&&<span> · Last observation: {new Date(data.observedAt).toLocaleString()}</span>}{error&&<p>{error}</p>}{data?.missingInputs?.map((x:string)=><p key={x}>{x}</p>)}</div>;
}
