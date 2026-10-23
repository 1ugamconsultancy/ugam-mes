import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getApiUrl } from '../config';
import {
  Bot,
  Sparkles,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Minus,
  Send,
  Trash2,
  RefreshCw,
  ExternalLink,
  GripVertical,
  ChevronRight,
  Clock,
  Cpu,
  Info
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  type?: 'daily-briefing' | 'calibration-alert' | 'gmp-advice' | 'general';
  actions?: { label: string; action: () => void }[];
}

interface CalibrationAlert {
  machineCode: string;
  machineName: string;
  workCenter: string;
  status: 'OVERDUE' | 'DUE_SOON' | 'VALID';
  dueDate: string;
  certificateNo?: string;
  parameter: string;
}

// Pool of daily GMP Advice (IATF 16949, GAMP 5, FDA 21 CFR Part 11)
const GMP_ADVICE_POOL = [
  {
    title: 'Line Clearance & Lot Segregation',
    standard: 'IATF 16949 §8.5.1 / GAMP 5',
    text: 'Before releasing Work Orders at WC-CNC and WC-ASSY, execute 100% physical line clearance. Ensure previous batch travelers, gauge blocks, and residual WIP are completely cleared to eliminate cross-lot contamination.',
    rule: 'Never commence a new lot without verified supervisor e-sign off on physical line clearance.'
  },
  {
    title: 'Metrology Reference Standards & Traceability',
    standard: 'ISO/IEC 17025 & IATF 16949 §7.1.5',
    text: 'All micrometer anvils, dial gauges, and temperature probes must be zero-referenced against NIST/NPL traceable master standard gauge blocks before start of each shift.',
    rule: 'Maintain ambient calibration room temperatures at 20°C ± 1°C for dimensional accuracy.'
  },
  {
    title: '21 CFR Part 11 Electronic Signature Integrity',
    standard: 'FDA 21 CFR §11.200 / GAMP Category 4',
    text: 'Electronic signatures hold identical legal equivalence to handwritten ink. Verify that your user credentials are never shared. Dual verification is required for critical recipe parameter overrides and ECO approvals.',
    rule: 'Dual credential authorization (User ID + Encrypted Password) is mandatory for master BOM revisions.'
  },
  {
    title: 'Critical Process Parameter (CPP) Guardbanding',
    standard: 'GAMP 5 Process Validation (PPQ)',
    text: 'Induction hardening pyrometers on HT-01 must stay within strict guardband boundaries (860°C ± 10°C). Any excursion past 12 seconds automatically triggers an OOS quarantine flag in the batch record.',
    rule: 'Document real-time thermal ramp-up curve and quench oil turbulence logs contemporaneously.'
  },
  {
    title: 'Mould Cavity Sanitization & Compound Expiry',
    standard: 'IATF 16949 §8.5.2 / ASTM D2000',
    text: 'On Rubber Moulding RM-01, verify that NBR compound preforms have not exceeded their 48-hour room-temperature vulcanization pot life. Clean heated mould cavities with non-abrasive brass tooling every 500 shots.',
    rule: 'Inspect elastomer flash thickness (<0.05 mm) and record Shore A durometer values hourly.'
  }
];

// Fallback calibration register data
const DEFAULT_CALIBRATION_ALERTS: CalibrationAlert[] = [
  {
    machineCode: 'CNC-01',
    machineName: 'CNC Turning Center 01',
    workCenter: 'WC-CNC',
    status: 'DUE_SOON',
    dueDate: '2026-09-26',
    certificateNo: 'CAL-2025-089',
    parameter: 'Spindle Runout (≤ 0.003 mm) & Chuck Concentricity'
  },
  {
    machineCode: 'HT-01',
    machineName: 'Heat Treatment Furnace 01',
    workCenter: 'WC-HT',
    status: 'OVERDUE',
    dueDate: '2026-09-24',
    certificateNo: 'CAL-2025-012',
    parameter: 'Type-K Thermocouple Drift (860°C ± 5°C)'
  },
  {
    machineCode: 'RM-01',
    machineName: 'Rubber Moulding Press 01',
    workCenter: 'WC-RM',
    status: 'VALID',
    dueDate: '2026-10-15',
    certificateNo: 'CAL-2026-104',
    parameter: 'Hydraulic Cavity Pressure Transducer (150 bar)'
  },
  {
    machineCode: 'CUT-01',
    machineName: 'Automatic Bar Cutter 01',
    workCenter: 'WC-CUT',
    status: 'VALID',
    dueDate: '2026-11-01',
    certificateNo: 'CAL-2026-044',
    parameter: 'Linear Optical Encoder & Blade Feed Rate'
  },
  {
    machineCode: 'ASM-01',
    machineName: 'Assembly Station 01',
    workCenter: 'WC-ASM',
    status: 'VALID',
    dueDate: '2026-10-28',
    certificateNo: 'CAL-2026-118',
    parameter: 'Pneumatic Press Load Cell (2.5 bar ± 0.1 bar)'
  }
];

function DemoAssistant() {
  const navigate = useNavigate();
  const { token } = useShopfloorStore();

  // State: Minimized vs Expanded
  const [isOpen, setIsOpen] = useState(false);
  const [activeBannerTab, setActiveBannerTab] = useState<'gmp' | 'calibration'>('gmp');

  // Daily Advice Index
  const todayStr = new Date().toISOString().split('T')[0];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  const todayGmpIndex = Math.abs(dayOfYear) % GMP_ADVICE_POOL.length;
  const todayGmp = GMP_ADVICE_POOL[todayGmpIndex];

  // Calibration Alerts
  const [calibrationAlerts, setCalibrationAlerts] = useState<CalibrationAlert[]>(DEFAULT_CALIBRATION_ALERTS);

  // Messages Thread
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Draggable Coordinates State
  // Default position: bottom-left corner
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('ugam_ai_chatbot_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return { x: 24, y: Math.max(100, window.innerHeight - 90) };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0
  });
  const hasMovedRef = useRef<boolean>(false);

  // 1. Fetch live calibration status from backend if available
  useEffect(() => {
    const fetchEquipmentCal = async () => {
      if (!token) return;
      try {
        const res = await fetch(getApiUrl('/equipment/calibrations'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: CalibrationAlert[] = data.map((c: any) => {
              const due = c.nextCalibrationDue || '2026-10-01';
              const dueDateObj = new Date(due);
              const now = new Date();
              const diffDays = Math.ceil((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              let status: 'OVERDUE' | 'DUE_SOON' | 'VALID' = 'VALID';
              if (diffDays < 0) status = 'OVERDUE';
              else if (diffDays <= 7) status = 'DUE_SOON';

              return {
                machineCode: c.machine?.code || 'EQ-01',
                machineName: c.machine?.name || 'Equipment Asset',
                workCenter: c.machine?.workCenter || 'WC-GEN',
                status,
                dueDate: due.split('T')[0],
                certificateNo: c.certificateNumber || 'CERT-NIST',
                parameter: 'Sensor & Metrology Accuracy'
              };
            });
            setCalibrationAlerts(mapped);
          }
        }
      } catch (err) {
        // Fallback to default realistic simulation data
      }
    };
    fetchEquipmentCal();
  }, [token]);

  // 2. Daily Pop-up on each day visit
  useEffect(() => {
    const lastPopup = localStorage.getItem('ugam_ai_last_popup_date');
    if (lastPopup !== todayStr) {
      // It's a new day! Auto pop-up the chatbot
      setIsOpen(true);
      localStorage.setItem('ugam_ai_last_popup_date', todayStr);
    }
  }, [todayStr]);

  // 3. Initialize Initial Conversation Greeting with Daily GMP & Calibration Briefing
  useEffect(() => {
    const overdueCount = calibrationAlerts.filter((c) => c.status === 'OVERDUE').length;
    const dueSoonCount = calibrationAlerts.filter((c) => c.status === 'DUE_SOON').length;

    const initialGreeting: ChatMessage = {
      id: 'msg-welcome-01',
      sender: 'ai',
      text: `Hello Operator / Quality Engineer. I am your **UGAM AI Advisor & Machine Calibration Chatbot**.\n\nHere is your **Daily GMP & Calibration Briefing** for **${todayStr}**:\n\n` +
        `🛡️ **GMP Daily Focus:** *${todayGmp.title}*\n` +
        `• Standard: \`${todayGmp.standard}\`\n` +
        `• Directive: ${todayGmp.text}\n` +
        `• Mandatory SOP: **${todayGmp.rule}**\n\n` +
        `⚙️ **Machine Metrology & Calibration Status:**\n` +
        `• 🚨 **${overdueCount} Machine(s) Overdue Calibration**\n` +
        `• ⚠️ **${dueSoonCount} Machine(s) Calibration Due Within 7 Days**\n` +
        `• ✅ **${calibrationAlerts.filter((c) => c.status === 'VALID').length} Machine(s) Qualified & Compliant**\n\n` +
        `How can I assist you with calibration routines, IATF 16949 compliance, or batch execution today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'daily-briefing',
      actions: [
        {
          label: 'Inspect Overdue Equipment',
          action: () => {
            navigate('/equipment?tab=calibrations');
            setIsOpen(false);
          }
        },
        {
          label: 'View GMP Compliance Logs',
          action: () => {
            navigate('/compliance');
            setIsOpen(false);
          }
        }
      ]
    };

    setMessages([initialGreeting]);
  }, [todayGmp, calibrationAlerts, todayStr, navigate]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isThinking]);

  // 4. Clamping position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(10, Math.min(window.innerWidth - 70, prev.x)),
        y: Math.max(10, Math.min(window.innerHeight - 70, prev.y))
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 5. Drag handling logic
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary pointer button
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - dragStartRef.current.mouseX;
      const dy = moveEvt.clientY - dragStartRef.current.mouseY;

      if (Math.hypot(dx, dy) > 4) {
        hasMovedRef.current = true;
      }

      const newX = Math.max(10, Math.min(window.innerWidth - 65, dragStartRef.current.startX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 65, dragStartRef.current.startY + dy));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      // Persist to local storage
      setPosition((curr) => {
        try {
          localStorage.setItem('ugam_ai_chatbot_pos', JSON.stringify(curr));
        } catch {}
        return curr;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleIconClick = (e: React.MouseEvent) => {
    // If user dragged icon, do not toggle open/close
    if (hasMovedRef.current) {
      e.stopPropagation();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  // 6. Expert AI Response Generator
  const generateExpertResponse = useCallback(
    (userQuery: string): { reply: string; actions?: { label: string; action: () => void }[] } => {
      const q = userQuery.toLowerCase();

      // Check Calibration Query
      if (q.includes('calibration') || q.includes('calibrate') || q.includes('overdue') || q.includes('gauge') || q.includes('tolerance')) {
        const overdues = calibrationAlerts.filter((c) => c.status === 'OVERDUE');
        const dueSoons = calibrationAlerts.filter((c) => c.status === 'DUE_SOON');

        let detailText = '';
        if (overdues.length > 0) {
          detailText += `🚨 **URGENT CALIBRATIONS OVERDUE:**\n` +
            overdues.map((o) => `• **${o.machineCode}** (${o.machineName}) at \`${o.workCenter}\` — Critical Parameter: *${o.parameter}*. Due Date: **${o.dueDate}**`).join('\n') +
            `\n\n`;
        }
        if (dueSoons.length > 0) {
          detailText += `⚠️ **UPCOMING CALIBRATIONS (NEXT 7 DAYS):**\n` +
            dueSoons.map((o) => `• **${o.machineCode}** (${o.machineName}) at \`${o.workCenter}\` — Parameter: *${o.parameter}*. Due Date: **${o.dueDate}**`).join('\n') +
            `\n\n`;
        }

        return {
          reply: `Here is the current **Plant Metrology & Calibration Status**:\n\n${detailText}` +
            `📋 **Standard Calibration Protocol (ISO 17025 / IATF 16949):**\n` +
            `1. Perform zero-point verification using class 0 gauge blocks.\n` +
            `2. Clean contact probes using isopropyl alcohol.\n` +
            `3. Run a 10-point linearity test across the full stroke.\n` +
            `4. Upload NIST calibration certificates into the Equipment module and sign digitally.`,
          actions: [
            {
              label: 'Open Calibration Manager',
              action: () => {
                navigate('/equipment?tab=calibrations');
                setIsOpen(false);
              }
            }
          ]
        };
      }

      // Check CNC-01 query
      if (q.includes('cnc') || q.includes('cnc-01') || q.includes('spindle')) {
        return {
          reply: `🔧 **CNC-01 Turning Center Calibration & Metrology Guide:**\n\n` +
            `• **Equipment:** CNC-01 (CNC Turning Center 01)\n` +
            `• **Work Center:** \`WC-CNC\` (Machining Station)\n` +
            `• **Spindle Radial Runout:** Must be ≤ \`0.003 mm\` (Dial Indicator at 100 mm gauge length).\n` +
            `• **Chuck Concentricity:** ± \`0.005 mm\` TIR.\n` +
            `• **Thermal Drift Compensation:** Run spindle warm-up routine (RPM 1200 for 8 min) prior to qualifying tolerance.\n` +
            `• **Next Calibration Action:** Spindle alignment calibration due soon. Coordinate with Maintenance to prevent chatter marks on part \`INT-001\`.`,
          actions: [
            {
              label: 'Inspect CNC-01 Asset Profile',
              action: () => {
                navigate('/equipment?code=CNC-01');
                setIsOpen(false);
              }
            }
          ]
        };
      }

      // Check Heat Treatment HT-01
      if (q.includes('heat') || q.includes('ht-01') || q.includes('furnace') || q.includes('temper') || q.includes('quench')) {
        return {
          reply: `🔥 **HT-01 Heat Treatment Furnace 01 Calibration Alert:**\n\n` +
            `• **Status:** 🚨 **CALIBRATION OVERDUE** (Due ${calibrationAlerts.find((c) => c.machineCode === 'HT-01')?.dueDate || '2026-09-24'}).\n` +
            `• **Critical Parameter:** Dual Type-K Thermocouple Calibration (860°C ± 5°C).\n` +
            `• **CPP Risk:** Temperature drift above 870°C causes excessive austenite grain growth in \`INT-002\` (Heat Treated Pin), leading to brittle failures.\n` +
            `• **Immediate Action:** Attach external calibrated reference pyrometer and perform temperature uniformity survey (TUS) per AMS 2750 standard before running next induction cycle.`,
          actions: [
            {
              label: 'Log HT-01 Calibration',
              action: () => {
                navigate('/equipment?tab=calibrations&machine=HT-01');
                setIsOpen(false);
              }
            }
          ]
        };
      }

      // Check GMP or Compliance query
      if (q.includes('gmp') || q.includes('compliance') || q.includes('audit') || q.includes('fda') || q.includes('21 cfr') || q.includes('iatf')) {
        return {
          reply: `🛡️ **Good Manufacturing Practice (GMP) & Compliance Advisor:**\n\n` +
            `• **IATF 16949 Clause 7.1.5:** Requires measurement system analysis (GAGE R&R < 10% acceptable, 10-30% conditional).\n` +
            `• **21 CFR Part 11 Audit Trail:** Every batch entry, rework note, and recipe revision creates an immutable, timestamped cryptographic audit trail entry.\n` +
            `• **Line Clearance SOP:** Operators must sign the physical checklist before machine startup.\n` +
            `• **Batch Quarantine Rules:** If machine calibration expires during an active production run, parts produced must be placed under Engineering Review quarantine.`,
          actions: [
            {
              label: 'Review Plant Compliance Dashboard',
              action: () => {
                navigate('/compliance');
                setIsOpen(false);
              }
            }
          ]
        };
      }

      // Check Recipe / BOM query
      if (q.includes('recipe') || q.includes('bom') || q.includes('pin') || q.includes('seal') || q.includes('part')) {
        return {
          reply: `📦 **Master Recipe & Engineering BOM Advisor:**\n\n` +
            `Currently Active Master Recipes:\n` +
            `1. **RT-001 (CNC Precision Machining):** 100 mm Steel Bar EN8 → \`INT-001\` Machined Pin.\n` +
            `2. **RT-002 (Induction Hardening):** Induction harden at 860°C to 45-48 HRC → \`INT-002\` Heat Treated Pin.\n` +
            `3. **RT-003 (Rubber Moulding):** 80 g NBR Rubber Compound at 175°C → \`INT-003\` Rubber Seal.\n` +
            `4. **RT-004 (Control Pin Assembly):** Assembled \`FG-001\` Automotive Control Pin.\n` +
            `5. **RT-005 (Hydraulic Seal Assembly):** Reinforce with copper wire 2.5 mm → \`FG-002\`.\n\n` +
            `All recipes are locked under 21 CFR Part 11 e-signature authorization.`,
          actions: [
            {
              label: 'Go to Recipes & BOM Catalog',
              action: () => {
                navigate('/recipes');
                setIsOpen(false);
              }
            }
          ]
        };
      }

      // Default smart manufacturing response
      return {
        reply: `Thank you for your inquiry regarding "${userQuery}".\n\n` +
          `As the **UGAM AI Advisor & Machine Calibration Chatbot**, I can help you with:\n` +
          `• 🔬 Checking calibration due dates and certificates across all 6 production machines.\n` +
          `• 🛡️ Providing GMP advice, IATF 16949 audit rules, and 21 CFR Part 11 guidelines.\n` +
          `• ⚙️ Troubleshooting CNC spindle tolerances, furnace temperature drift, and press pressures.\n` +
          `• 📋 Guiding you through Master Recipes, visual BOM charges, and work order releases.\n\n` +
          `Select a quick question below or ask anything specific about machine calibration or shopfloor operations.`
      };
    },
    [calibrationAlerts, navigate]
  );

  // 7. Message Submit Handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    setTimeout(() => {
      const { reply, actions } = generateExpertResponse(userText);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 600);
  };

  const handleQuickPrompt = (promptText: string) => {
    setInputText(promptText);
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    setTimeout(() => {
      const { reply, actions } = generateExpertResponse(promptText);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 500);
  };

  const overdueCount = calibrationAlerts.filter((c) => c.status === 'OVERDUE').length;
  const dueSoonCount = calibrationAlerts.filter((c) => c.status === 'DUE_SOON').length;

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MINIMIZED DRAGGABLE FLOATING ICON (Always on screen, draggable)         */}
      {/* ========================================================================= */}
      {!isOpen && (
        <div
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            touchAction: 'none'
          }}
          className={`fixed top-0 left-0 z-50 select-none ${
            isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-105'
          } transition-transform duration-75`}
          onPointerDown={handlePointerDown}
          onClick={handleIconClick}
          title="UGAM AI Advisor & Machine Calibration Chatbot (Click to expand, drag across screen)"
        >
          <div className="relative group flex items-center">
            {/* Pulsing Aura */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#174A7C] to-[#F5A623] rounded-full blur-[3px] opacity-70 group-hover:opacity-100 transition animate-pulse"></div>

            {/* Floating Bot Sphere */}
            <div className="relative flex items-center gap-2 px-3 py-2.5 rounded-full bg-[#142A45] border-2 border-[#1F3A5C] group-hover:border-[#F5A623] text-white shadow-2xl transition">
              {/* Bot Icon with glowing badge */}
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#102237] border border-[#1F3A5C] text-[#F5A623]">
                <Bot size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#142A45] animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#142A45]" />
              </div>

              {/* Text Label pill */}
              <div className="flex flex-col text-left pr-1">
                <span className="text-[11px] font-extrabold text-white tracking-tight flex items-center gap-1">
                  UGAM AI Advisor
                  <Sparkles size={11} className="text-[#F5A623]" />
                </span>
                <span className="text-[9px] font-semibold text-slate-300">
                  GMP & Calibration
                </span>
              </div>

              {/* Alert Badge if machines overdue or due soon */}
              {(overdueCount > 0 || dueSoonCount > 0) && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold bg-red-500 text-white rounded-full shadow-md animate-bounce">
                  {overdueCount > 0 ? `! ${overdueCount}` : `⚠ ${dueSoonCount}`}
                </span>
              )}

              {/* Drag Handle Indicator */}
              <div className="text-slate-400 pl-0.5 opacity-60 group-hover:opacity-100">
                <GripVertical size={13} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXPANDED CHATBOT MODAL WINDOW                                          */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          style={{
            // Position anchored smoothly near the dragged position or bottom-left
            left: `${Math.min(Math.max(16, position.x), Math.max(16, window.innerWidth - 440))}px`,
            bottom: `${Math.min(Math.max(16, window.innerHeight - position.y - 40), window.innerHeight - 620)}px`
          }}
          className="fixed z-50 w-[380px] sm:w-[430px] h-[610px] max-h-[90vh] bg-white dark:bg-[#142A45] border border-slate-200 dark:border-[#1F3A5C] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-100 dark:bg-[#102237] border-b border-slate-200 dark:border-[#1F3A5C] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#174A7C]/20 border border-[#174A7C] text-[#F5A623] flex-shrink-0">
                <Bot size={18} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#142A45]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  UGAM AI Advisor & Machine Calibration Chatbot
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>GMP Metrology Expert</span>
                  <span>•</span>
                  <span className="text-[#F5A623] font-semibold">IATF 16949</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
              <button
                onClick={() => setMessages(messages.slice(0, 1))}
                title="Clear Chat History"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#142A45] transition cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Window"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#142A45] transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Daily Briefing Banner Segmented Button Cards (GMP Advice & Calibration Alerts) */}
          <div className="p-2 bg-slate-50 dark:bg-[#102237]/80 border-b border-slate-200 dark:border-[#1F3A5C] flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-[#102237] p-1 rounded-xl border border-slate-300/80 dark:border-[#1F3A5C] text-[10px] font-bold shadow-inner">
              <button
                onClick={() => setActiveBannerTab('gmp')}
                className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 ${
                  activeBannerTab === 'gmp'
                    ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/30 border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#142A45]'
                }`}
              >
                <ShieldCheck size={13} className={activeBannerTab === 'gmp' ? 'text-emerald-500' : 'text-slate-400'} />
                <span>Daily GMP Advice</span>
              </button>
              <button
                onClick={() => setActiveBannerTab('calibration')}
                className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 ${
                  activeBannerTab === 'calibration'
                    ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/30 border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#142A45]'
                }`}
              >
                <Wrench size={13} className={activeBannerTab === 'calibration' ? 'text-[#F5A623]' : 'text-slate-400'} />
                <span>Calibration Alerts</span>
                {overdueCount > 0 ? (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {overdueCount}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400">
                    {calibrationAlerts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Banner Content: GMP Advice */}
            {activeBannerTab === 'gmp' && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                    <ShieldCheck size={13} /> {todayGmp.title}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold">
                    {todayGmp.standard}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {todayGmp.text}
                </p>
                <div className="mt-1.5 pt-1.5 border-t border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold flex items-center gap-1">
                  <span className="font-extrabold uppercase">Rule:</span> {todayGmp.rule}
                </div>
              </div>
            )}

            {/* Banner Content: Calibration Alerts */}
            {activeBannerTab === 'calibration' && (
              <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <span>Machine Metrology Audit ({calibrationAlerts.length} Equipment Assets)</span>
                  <button
                    onClick={() => {
                      navigate('/equipment?tab=calibrations');
                      setIsOpen(false);
                    }}
                    className="text-[10px] underline hover:text-amber-300 flex items-center gap-0.5 cursor-pointer font-bold"
                  >
                    View All <ExternalLink size={10} />
                  </button>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 mes-scrollbar pr-1">
                  {calibrationAlerts.map((cal) => (
                    <div
                      key={cal.machineCode}
                      className="p-1.5 rounded bg-white/70 dark:bg-[#142A45]/80 border border-slate-200 dark:border-[#1F3A5C] flex items-center justify-between text-[11px]"
                    >
                      <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {cal.machineCode}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {cal.workCenter}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                          {cal.parameter}
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          cal.status === 'OVERDUE'
                            ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                            : cal.status === 'DUE_SOON'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        }`}
                      >
                        {cal.status === 'OVERDUE' ? 'OVERDUE' : cal.status === 'DUE_SOON' ? 'DUE SOON' : 'VALID'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Message Scroll Thread */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 mes-scrollbar bg-white dark:bg-[#142A45]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-[#102237] border border-[#1F3A5C] text-[#F5A623] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#174A7C] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#102237] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#1F3A5C] shadow-sm'
                  }`}
                >
                  {/* Message formatted with basic markdown rendering */}
                  <div className="whitespace-pre-line space-y-1 font-normal">
                    {msg.text.split('\n').map((line, lIdx) => {
                      if (line.startsWith('• ')) {
                        return (
                          <div key={lIdx} className="pl-2 border-l-2 border-[#174A7C] dark:border-[#F5A623] my-0.5">
                            {line.substring(2)}
                          </div>
                        );
                      }
                      return <p key={lIdx}>{line}</p>;
                    })}
                  </div>

                  {/* Actions buttons attached to AI message */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-[#1F3A5C] flex flex-wrap gap-1.5">
                      {msg.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={act.action}
                          className="px-2.5 py-1 rounded bg-[#174A7C]/20 hover:bg-[#174A7C] text-[#174A7C] dark:text-[#F5A623] hover:text-white border border-[#174A7C]/40 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>{act.label}</span>
                          <ChevronRight size={11} />
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`mt-1.5 text-[9px] ${
                      msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400 text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500 dark:text-slate-400">
                <div className="w-6 h-6 rounded-full bg-[#102237] border border-[#1F3A5C] text-[#F5A623] flex items-center justify-center">
                  <Bot size={13} />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin text-[#F5A623]" />
                  <span className="text-[11px] font-medium">UGAM AI Metrology Engine analyzing plant telemetry...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="p-2 bg-slate-50 dark:bg-[#102237]/60 border-t border-slate-200 dark:border-[#1F3A5C] flex-shrink-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 mes-scrollbar text-[10px]">
              <button
                type="button"
                onClick={() => handleQuickPrompt('Check overdue machine calibration status')}
                className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-[#142A45] hover:bg-[#174A7C] hover:text-white text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] transition shrink-0 cursor-pointer font-semibold"
              >
                🔍 Calibration Alerts
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('Explain CNC-01 spindle calibration procedure')}
                className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-[#142A45] hover:bg-[#174A7C] hover:text-white text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] transition shrink-0 cursor-pointer font-semibold"
              >
                ⚙️ CNC-01 Spindle
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('What is the IATF 16949 line clearance rule?')}
                className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-[#142A45] hover:bg-[#174A7C] hover:text-white text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] transition shrink-0 cursor-pointer font-semibold"
              >
                🛡️ GMP Line Clearance
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('Why is HT-01 thermocouple calibration critical?')}
                className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-[#142A45] hover:bg-[#174A7C] hover:text-white text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] transition shrink-0 cursor-pointer font-semibold"
              >
                🔥 HT-01 Thermocouple
              </button>
            </div>
          </div>

          {/* User Input Field */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-slate-100 dark:bg-[#102237] border-t border-slate-200 dark:border-[#1F3A5C] flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask UGAM AI about calibration, GMP, machine tolerances..."
              className="flex-1 bg-white dark:bg-[#142A45] border border-slate-300 dark:border-[#1F3A5C] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#174A7C] dark:focus:border-[#F5A623] transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className="h-8 w-8 rounded-lg bg-[#174A7C] hover:bg-[#142A45] active:scale-95 disabled:opacity-40 text-white flex items-center justify-center transition shadow-md shadow-[#174A7C]/25 cursor-pointer flex-shrink-0"
              title="Send Message"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default function UgamAIChatbot(){
 const {token}=useShopfloorStore();const [enabled,setEnabled]=useState(false);
 useEffect(()=>{setEnabled(false);if(token)fetch(getApiUrl('/auth/runtime'),{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():null).then(d=>setEnabled(d?.appMode==='demo')).catch(()=>setEnabled(false));},[token]);
 return enabled?<><div className="fixed bottom-0 left-0 z-50 bg-amber-100 text-amber-900 text-xs p-1">SIMULATED assistant - illustrative content, not production evidence</div><DemoAssistant/></>:null;
}
