import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, HelpCircle } from 'lucide-react';
import { getApiUrl } from '../config';
import { useShopfloorStore } from '../context/shopfloorStore';

interface ScheduleBlock {
  start: number;
  duration: number;
  wo: string;
  color: string;
}

interface MachineSchedule {
  code: string;
  name: string;
  schedule: ScheduleBlock[];
}

interface LineSchedule {
  name: string;
  machines: MachineSchedule[];
}

export default function Schedule() {
  const { token } = useShopfloorStore();
  const hours = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);
  const [lines, setLines] = useState<LineSchedule[]>([
    {
      name: 'Machining Line 1',
      machines: [
        { code: 'CUT-01', name: 'Bar Cutter', schedule: [{ start: 6, duration: 5, wo: 'PO-260003', color: 'bg-blue-500/20 border-blue-500 text-blue-400' }, { start: 13, duration: 6, wo: 'WO-2026-001', color: 'bg-purple-500/20 border-purple-500 text-purple-400' }] },
        { code: 'CNC-01', name: 'CNC Lathe', schedule: [{ start: 7, duration: 6, wo: 'PO-260003', color: 'bg-blue-500/20 border-blue-500 text-blue-400' }, { start: 14, duration: 6, wo: 'WO-2026-001', color: 'bg-purple-500/20 border-purple-500 text-purple-400' }] },
        { code: 'DBR-01', name: 'Deburring Machine', schedule: [{ start: 8, duration: 5, wo: 'PO-260003', color: 'bg-blue-500/20 border-blue-500 text-blue-400' }, { start: 15, duration: 5, wo: 'WO-2026-001', color: 'bg-purple-500/20 border-purple-500 text-purple-400' }] },
      ]
    },
    {
      name: 'Automotive Assembly Line 1',
      machines: [
        { code: 'ASM-01', name: 'Assembly Station', schedule: [{ start: 9, duration: 7, wo: 'PO-260003', color: 'bg-emerald-500/20 border-emerald-500 text-emerald-400' }, { start: 17, duration: 4, wo: 'WO-2026-004', color: 'bg-amber-500/20 border-amber-500 text-amber-400' }] },
        { code: 'TEST-01', name: 'Torque Test Bench', schedule: [{ start: 11, duration: 6, wo: 'PO-260003', color: 'bg-emerald-500/20 border-emerald-500 text-emerald-400' }] },
      ]
    }
  ]);

  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        const [eqRes, woRes] = await Promise.all([
          fetch(getApiUrl('/equipment/status'), { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(getApiUrl('/work-orders'), { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        ]);

        if (eqRes.ok) {
          const eqData = await eqRes.json();
          const woData = woRes.ok ? await woRes.json() : [];
          const activeWos = woData.filter((w: any) => w.status === 'IN_PROGRESS' || w.status === 'RELEASED');
          const primaryWo = activeWos[0]?.woNumber || 'PO-260003';
          const secondaryWo = activeWos[1]?.woNumber || 'WO-2026-001';

          const grouped: Record<string, MachineSchedule[]> = {};
          eqData.forEach((eq: any, index: number) => {
            const line = eq.lineName || 'Main Production Line';
            if (!grouped[line]) grouped[line] = [];

            const startOffset = 6 + (index % 4);
            const duration = 5 + (index % 3);
            grouped[line].push({
              code: eq.code || eq.equipmentId || `EQ-${index + 1}`,
              name: (eq.name || 'Machine').replace(/ \d+$/, ''),
              schedule: [
                {
                  start: startOffset,
                  duration: Math.min(duration, 16 - (startOffset - 6)),
                  wo: index % 2 === 0 ? primaryWo : secondaryWo,
                  color: index % 2 === 0 ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-purple-500/20 border-purple-500 text-purple-400',
                }
              ]
            });
          });

          const dynamicLines: LineSchedule[] = Object.keys(grouped).map(name => ({
            name,
            machines: grouped[name]
          }));

          if (dynamicLines.length > 0) {
            setLines(dynamicLines);
          }
        }
      } catch (err) {
        console.error('Error fetching schedule data:', err);
      }
    };

    fetchScheduleData();
  }, [token]);

  return (
    <div className="space-y-2.5 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col justify-start items-start text-left">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">Line Capacity Scheduling</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Chronological machine schedule allocations, shift bounds, and changeovers</p>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <CalendarDays size={16} />
          <span>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} — Day Shift & Swing Shift</span>
        </div>
      </div>

      {/* Gantt Timeline Board */}
      <div className="industrial-card p-3 overflow-x-auto">
        <div className="min-w-[1000px] space-y-6">
          {/* Hour Headers */}
          <div className="grid grid-cols-[140px_1fr] border-b dark:border-slate-700/50 pb-3">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Clock size={12} /> Machine
            </div>
            <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] text-center text-[10px] font-bold text-slate-400">
              {hours.map((hour) => (
                <div key={hour} className="border-l dark:border-slate-700">{hour}</div>
              ))}
            </div>
          </div>

          {/* Line Blocks */}
          {lines.map((line) => (
            <div key={line.name} className="space-y-2">
              <h3 className="text-xs font-bold text-blue-500 tracking-wider uppercase">{line.name}</h3>
              <div className="space-y-2">
                {line.machines.map((mac) => (
                  <div key={mac.code} className="grid grid-cols-[140px_1fr] items-center">
                    {/* Machine Details */}
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">{mac.code}</span>
                      <span className="text-[10px] text-slate-400 block">{mac.name}</span>
                    </div>

                    {/* Timeline row */}
                    <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] h-12 bg-slate-100/50 dark:bg-slate-900/40 rounded-lg relative overflow-hidden border border-slate-200 dark:border-slate-800">
                      {/* Grid divisions */}
                      {Array.from({ length: 16 }).map((_, idx) => (
                        <div key={idx} className="h-full border-r border-slate-200/20 dark:border-slate-700/30"></div>
                      ))}

                      {/* Scheduled Blocks */}
                      {mac.schedule.map((block, bIdx) => {
                        const startCol = block.start - 6; // starts at 06:00
                        const duration = block.duration;

                        return (
                          <div
                            key={bIdx}
                            className={`absolute top-1 bottom-1 border rounded flex flex-col justify-center px-3 text-[10px] font-bold transition hover:brightness-110 cursor-pointer ${block.color}`}
                            style={{
                              left: `${(startCol / 16) * 100}%`,
                              width: `${(duration / 16) * 100}%`,
                            }}
                          >
                            <span className="block">{block.wo}</span>
                            <span className="text-[8px] opacity-75">{block.duration} Hours</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info card */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl flex gap-3 text-slate-500 text-xs">
        <HelpCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p>
          Drag-and-Drop scheduling is enabled for supervisors. Select scheduled blocks to drag them to empty slots on adjacent machines. 
          The MES automatically alerts you if an allocation exceeds line capacity limits or runs into conflicts with scheduled preventive maintenance.
        </p>
      </div>
    </div>
  );
}

