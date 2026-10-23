import { useEffect, useState } from 'react';
import { getApiUrl } from '../config';
import { useShopfloorStore } from '../context/shopfloorStore';

export function useRuntimeMode() {
  const token = useShopfloorStore(s => s.token);
  const [result, setResult] = useState<{token: string|null; mode: 'production'|'demo'|null; error: string}>({token:null,mode:null,error:''});
  useEffect(() => {
    const controller = new AbortController();
    setResult({token,mode:null,error:''});
    if (token) fetch(getApiUrl('/auth/runtime'), {headers:{Authorization:`Bearer ${token}`},signal:controller.signal})
      .then(async r => {if(!r.ok) throw Error('Runtime mode unavailable'); const d=await r.json(); if(!['production','demo'].includes(d.appMode)) throw Error('Invalid runtime mode'); return d.appMode;})
      .then(mode => {if(!controller.signal.aborted)setResult({token,mode,error:''});})
      .catch(() => {if(!controller.signal.aborted)setResult({token,mode:null,error:'Runtime mode unavailable. Demonstrations and writes are disabled.'});});
    return () => controller.abort();
  }, [token]);
  return result.token===token ? result : {token,mode:null,error:''};
}
