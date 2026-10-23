import React, { useState, useEffect } from 'react';
import { Search, Link, Cpu, Layers } from 'lucide-react';
import { getApiUrl } from '../config';
import { useShopfloorStore } from '../context/shopfloorStore';

interface MaterialGenealogy {
  lotNumber: string;
  productName: string;
  sku: string;
  status: string;
  quantity: string | number;
  consumedMaterials: Array<{
    lotNumber: string;
    productName: string;
    sku: string;
    quantityConsumed: string | number;
    supplier: string;
  }>;
  operationsLogs: Array<{
    operation: string;
    machine: string;
    operator: string;
    timestamp: string;
  }>;
}

export default function Inventory() {
  const { token } = useShopfloorStore();
  const [searchLot, setSearchLot] = useState('PO-260003');
  const [result, setResult] = useState<MaterialGenealogy | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTraceability = async (lot: string) => {
    if (!lot.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/inventory/traceability/${lot.trim()}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.lotNumber) {
          setResult(data);
          return;
        }
      }
      setResult(null);
    } catch (err) {
      console.error('Traceability fetch error:', err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraceability('PO-260003');
  }, [token]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTraceability(searchLot);
  };

  return (
    <div className="space-y-2.5 font-sans">
      <div className="flex flex-col justify-start items-start text-left">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">Batch Lot Traceability</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Trace raw component genealogy, assembly process logs, and supplier links</p>
        </div>

      {/* Lookup Bar */}
      <div className="industrial-card p-3 bg-slate-900 border-slate-800 text-white">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search size={18} />
            </span>
            <input
              type="text"
              required
              value={searchLot}
              onChange={(e) => setSearchLot(e.target.value)}
              placeholder="Enter Lot or Batch Number (e.g. PO-260003 or WO-2026-001)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 placeholder-slate-500 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 px-6 rounded-lg text-sm transition"
          >
            Trace Lot Genealogy
          </button>
        </form>
      </div>

      {/* Result Trace Details */}
      {result ? (
        <div className="space-y-8">
          {/* Header metadata summary */}
          <div className="industrial-card p-3 flex flex-col md:flex-row justify-between gap-3 border-l-4 border-blue-500">
            <div>
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest block">Traced Output Lot</span>
              <h3 className="text-base font-bold dark:text-white mt-1">{result.lotNumber}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{result.productName} ({result.sku})</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block">Lot Status</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded">
                  {result.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block">Lot Quantity</span>
                <span className="text-base font-bold dark:text-white">{result.quantity} PCS</span>
              </div>
            </div>
          </div>

          {/* Flow Genealogy Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Raw materials consumed */}
            <div className="industrial-card p-3 space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={16} /> Consumed Component Lots
              </h4>
              {result.consumedMaterials.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 border border-dashed rounded-lg dark:border-slate-700">
                  No materials consumed. This is a root component lot.
                </div>
              ) : (
                <div className="space-y-4">
                  {result.consumedMaterials.map((mat) => (
                    <div key={mat.lotNumber} className="p-3 bg-slate-100/50 dark:bg-slate-800/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-sm text-slate-900 dark:text-white block">{mat.lotNumber}</strong>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block">{mat.productName} ({mat.sku})</span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                          Qty: {mat.quantityConsumed}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block border-t dark:border-slate-700 pt-1.5">Supplier: {mat.supplier}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SMT operational trace logs */}
            <div className="industrial-card p-3 space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={16} /> Shopfloor Processing History
              </h4>
              {result.operationsLogs.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 border border-dashed rounded-lg dark:border-slate-700">
                  No processing logs recorded for this lot.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 pl-5 space-y-6 py-2">
                  {result.operationsLogs.map((log, index) => (
                    <div key={index} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-7 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800"></span>
                      <strong className="text-xs text-slate-900 dark:text-white block">{log.operation}</strong>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between gap-3">
                        <span>Machine: {log.machine} | Op: {log.operator}</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 border border-dashed dark:border-slate-700 rounded-xl text-center text-slate-400 text-sm">
          Enter a valid finished goods lot number above to display genealogy flow
        </div>
      )}
    </div>
  );
}
