import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  Calculator,
  Cpu,
  ShieldAlert,
  Boxes,
  Users,
  CalendarDays,
  FileText,
  Phone,
  Mail,
  MessageSquare,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Search,
  QrCode,
  GitFork,
  AlertTriangle,
  Layers,
  Truck,
  RotateCcw,
  Wrench,
  Smartphone,
  CheckCircle2,
  Clock,
  Globe,
  Award,
  Sparkles,
  ArrowRight,
  MonitorPlay,
  ClipboardList
} from 'lucide-react';

export default function Help() {
  const [activeSection, setActiveSection] = useState<string>('contact');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const sections = [
    {
      id: 'contact',
      category: 'Support',
      title: 'Contact Us & Technical Support',
      icon: <Phone size={18} />,
      badge: 'Helpdesk',
      content: (
        <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {/* Header intro */}
          <div className="bg-gradient-to-r from-blue-600/10 via-[#174A7C]/10 to-transparent p-4 rounded-xl border border-blue-500/20">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="text-[#F5A623]" size={18} />
              Ugam MES Enterprise Customer Support
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Direct engineering support, plant deployment assistance, operational troubleshooting, and system integration.
            </p>
          </div>

          {/* Contact Direct Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Card */}
            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-500 transition group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Mail size={20} />
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  Direct Email
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inquiries & Escalations</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono select-all mt-0.5">
                himanee@ugamconsultancy.com
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <a
                  href="mailto:himanee@ugamconsultancy.com?subject=Ugam%20MES%20Support%20Inquiry"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#174A7C] hover:bg-[#142A45] text-white text-xs font-bold transition shadow-sm"
                >
                  <Mail size={13} />
                  <span>Send Email</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard('himanee@ugamconsultancy.com', 'email')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                  title="Copy email to clipboard"
                >
                  {copiedField === 'email' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Phone & WhatsApp Card */}
            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-500 transition group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Phone size={20} />
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  Voice & WhatsApp
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Direct Helpline</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono select-all mt-0.5">
                +91-7030908607
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <a
                  href="tel:+917030908607"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <Phone size={13} />
                  <span>Call Now</span>
                </a>
                <a
                  href="https://wa.me/917030908607?text=Hello%20Ugam%20MES%20Support%20Team,%20I%20have%20an%20inquiry%20regarding%20the%20MES%20application."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1"
                  title="Chat on WhatsApp"
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard('+917030908607', 'phone')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                  title="Copy phone number"
                >
                  {copiedField === 'phone' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedField === 'phone' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Operational Hours & Response SLAs */}
          <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock size={14} className="text-blue-500" />
              Support Operating Hours & Service Level Agreements (SLA)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-red-600 dark:text-red-400">Severity 1: Line Down</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Active production outage / batch interlock failure
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 font-mono">
                  Response: &lt; 15 mins (24/7)
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-amber-600 dark:text-amber-400">Severity 2: Degraded</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Quality hold, scanner lag, partial telemetry drop
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 font-mono">
                  Response: &lt; 2 hours
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-blue-600 dark:text-blue-400">Severity 3: General</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Formula config, report queries, user onboarding
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 font-mono">
                  Mon–Sat: 09:00 – 19:00 IST
                </div>
              </div>
            </div>
          </div>

          {/* Company Profile */}
          <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                UC
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Ugam Consultancy Services Pvt. Ltd.</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Next Generation MES for Connected, Traceable Manufacturing
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <Globe size={13} />
              <span>India</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'track-trace',
      category: 'Core Modules',
      title: 'Track & Trace (Genealogy & Serialization)',
      icon: <GitFork size={18} />,
      badge: 'FDA / IATF',
      content: (
        <div className="space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            The **Track & Trace** suite provides end-to-end bidirectional serialization, genealogy mapping, and instant recall simulation compliant with FDA 21 CFR Part 11 and IATF 16949 standards.
          </p>

          {/* 4 Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs mb-1">
                <GitFork size={15} className="text-blue-500" />
                <span>Genealogy Trace Tree</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Visualizes complete parent-child hierarchies. Enter any finished pack serial number or batch ID to inspect the exact raw material lots, vendor certificates, and machine runs that produced it.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs mb-1">
                <QrCode size={15} className="text-emerald-500" />
                <span>2D GS1 DataMatrix & QR Scanning</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Encodes GTIN (01), Serial Number (21), Lot Number (10), and Expiry Date (17). Operators can scan barcodes using industrial USB scanners, Bluetooth wands, or built-in tablet cameras.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs mb-1">
                <RotateCcw size={15} className="text-red-500" />
                <span>Mock Recall Simulator</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Simulates targeted recall blast radius in seconds. Select a suspect raw material lot to automatically pinpoint all affected batch records, warehouse totes, and dispatched customer shipments.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs mb-1">
                <Truck size={15} className="text-purple-500" />
                <span>Shipments & Chain of Custody</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Logs dispatch dates, carrier tracking, shipping container manifests, and customer delivery pedigrees to ensure unbroken chain of custody through the supply chain.
              </p>
            </div>
          </div>

          {/* 5W1H Audit Ledger */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Award size={15} className="text-[#F5A623]" />
              The 5W1H Regulatory Milestone Ledger
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Every barcode scan, station transfer, and electronic sign-off writes an immutable audit record:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-blue-600 dark:text-blue-400">WHO:</span> Operator & Supervisor ID
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">WHAT:</span> Quantity, SKU & Lot
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-purple-600 dark:text-purple-400">WHEN:</span> Precise ISO Timestamp
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-amber-600 dark:text-amber-400">WHERE:</span> Station & Line ID
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">WHY:</span> Recipe Stage / CPP
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-red-600 dark:text-red-400">HOW:</span> 21 CFR Part 11 E-Signature
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'operations',
      category: 'Core Modules',
      title: 'Shopfloor Operations & Operator Station',
      icon: <Smartphone size={18} />,
      badge: 'Execution',
      content: (
        <div className="space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            The **Operator Station** guides line workers through standardized, mistake-proof manufacturing steps with automated interlocks and real-time electronic batch record capture.
          </p>

          {/* 6-Station Sequence */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              6-Stage Sequential Station Interlocks
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center text-[10px] font-extrabold">
                    01
                  </span>
                  <span>ST-01: Kitting & Weighing</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Precision tare scale validation & raw material dispensing within ±0.5% tolerance.
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center text-[10px] font-extrabold">
                    02
                  </span>
                  <span>ST-02: Blending & Granulation</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  High-shear mixer cycle with automated RPM and moisture sampling verification.
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center text-[10px] font-extrabold">
                    03
                  </span>
                  <span>ST-03: Tableting Compression</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Continuous punch turret monitoring: hardness, friability, and thickness checks.
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center text-[10px] font-extrabold">
                    04
                  </span>
                  <span>ST-04: Film Coating</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Inlet/outlet spray air temperature logging and pan rotation uniformity.
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center text-[10px] font-extrabold">
                    05
                  </span>
                  <span>ST-05: Blister Packaging</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Thermoforming seal temperature, camera leak detection & serialized foil print.
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center text-[10px] font-extrabold">
                    06
                  </span>
                  <span>ST-06: Final Inspection</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  100% checkweigher audit, case aggregation barcode scan, and QA release.
                </div>
              </div>
            </div>
          </div>

          {/* Key Compliance Mechanisms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 space-y-1">
              <div className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <ShieldCheck size={15} />
                <span>Poka-Yoke BOM Barcode Scan</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                The operator station will not accept raw material addition until the operator scans the physical barcode on the tote. If the material code or lot does not match the recipe BOM, the screen triggers a visual red interlock lock.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 space-y-1">
              <div className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <Award size={15} />
                <span>Dual E-Signatures (21 CFR Part 11)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                Critical process parameters (CPP) and station lot handoffs require two encrypted signatures: the performing operator sign-off and the QA supervisor counter-signature with reason codes.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'quality-compliance',
      category: 'Core Modules',
      title: 'Batch Records & Quality Compliance (eBMR)',
      icon: <ClipboardList size={18} />,
      badge: 'Audits',
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            The **Batch Records (eBMR)** and **Quality & SPC** modules enforce paperless compliance, in-process statistical process control, and GMP qualification.
          </p>

          {/* eBMR Workflow */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Electronic Batch Record (eBMR) Lifecycle
            </h5>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                1. DRAFT
              </span>
              <ArrowRight size={14} className="text-slate-400" />
              <span className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                2. RELEASED
              </span>
              <ArrowRight size={14} className="text-slate-400" />
              <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                3. IN_PROGRESS
              </span>
              <ArrowRight size={14} className="text-slate-400" />
              <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                4. COMPLETED
              </span>
              <ArrowRight size={14} className="text-slate-400" />
              <span className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                5. AUDITED & ARCHIVED
              </span>
            </div>
          </div>

          {/* SPC & Deviation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Statistical Process Control (SPC)</div>
              <p className="text-slate-600 dark:text-slate-400">
                Real-time X-bar and R charts plot hourly in-process samples against Upper Specification Limits (USL) and Lower Specification Limits (LSL), calculating dynamic Cp and Cpk capability indices.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white mb-1">CAPA & Non-Conformance</div>
              <p className="text-slate-600 dark:text-slate-400">
                Any critical CPP violation or out-of-specification test immediately quarantines the lot and generates an electronic Corrective & Preventive Action (CAPA) ticket requiring Quality approval.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'oee',
      category: 'Analytics',
      title: 'OEE Calculations & Equipment Metrics',
      icon: <Calculator size={18} />,
      badge: 'Productivity',
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            Overall Equipment Effectiveness (OEE) is the gold standard for measuring manufacturing productivity across your plant lines. It is computed as:
          </p>
          <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl font-mono text-xs space-y-2 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-bold text-[#174A7C] dark:text-[#F5A623]">
              OEE % = Availability % × Performance % × Quality %
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
            <div>• Availability % = (Actual Operating Time / Planned Production Time) × 100</div>
            <div>• Performance % = (Actual Output / (Actual Operating Time × Ideal Cycle Rate)) × 100</div>
            <div>• Quality % = (Good Output / Total Output Produced) × 100</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-lg">
              <div className="font-bold">World-Class OEE &gt; 85%</div>
              <div className="text-[11px] mt-0.5">High availability (&gt;90%), fast cycle rate (&gt;95%), minimal scrap (&gt;99.9%).</div>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 rounded-lg">
              <div className="font-bold">Target Benchmark: 65% – 85%</div>
              <div className="text-[11px] mt-0.5">Typical industrial standard with planned maintenance intervals.</div>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-lg">
              <div className="font-bold">Sub-optimal &lt; 65%</div>
              <div className="text-[11px] mt-0.5">Indicates excessive changeovers, micro-stoppages, or high rework.</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'monitoring',
      category: 'Analytics',
      title: 'Shopfloor Machine Statuses & Telemetry',
      icon: <Cpu size={18} />,
      badge: 'OPC Kepware',
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            Machines across all active packaging and formulation lines are categorized into 5 color-coded states driven by OPC Kepware sync or operator state overrides:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
              <span>RUNNING: Actively processing live production work order</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span>IDLE: Work order loaded but machine conveyor paused</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 animate-ping"></span>
              <span>BREAKDOWN: Active equipment fault / unscheduled stoppage</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
              <span>SETUP: Tooling, die change, or line clearance wash</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
              <span>MAINTENANCE: Scheduled preventive calibration or audit</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'master-data',
      category: 'Configuration',
      title: 'Master Data Setup (Materials, Recipes, UOM)',
      icon: <Boxes size={18} />,
      badge: 'Admin',
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            Administrative guide for defining materials, audited vendors, units of measure, and released Master Batch Recipes (MBR):
          </p>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white mb-1">1. How to Add Materials</div>
              <p className="text-slate-600 dark:text-slate-400">
                Go to **Material Management** &gt; click **+ Add Material**. Provide Material Code (e.g. `RM001`, `PK001`), Material Name, Type (`RAW_MATERIAL`, `PACKAGING`, `INTERMEDIATE`), Unit of Measure (UOM), and Qualified Vendor.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white mb-1">2. How to Add Types &amp; Units of Measure (UOM)</div>
              <p className="text-slate-600 dark:text-slate-400">
                In the **Admin Panel** &gt; select **Material Types &amp; UOM**. Add standard units (e.g. `KG`, `L`, `PCS`, `MG`) and custom classification tags. These immediately sync with PostgreSQL master data.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white mb-1">3. How to Release Master Batch Recipes (MBR)</div>
              <p className="text-slate-600 dark:text-slate-400">
                Navigate to **Recipes &amp; BOM** &gt; click **+ Add New Recipe**. Configure finished product SKU, attach raw ingredients with required quantities, define sequential workstation steps, and authenticate with your e-signature password (`MES123`) to release the recipe for shopfloor execution.
              </p>
            </div>
          </div>
        </div>
      ),
    }
  ];

  const filteredSections = sections.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.title.toLowerCase().includes(q) ||
      sec.category.toLowerCase().includes(q) ||
      sec.badge.toLowerCase().includes(q)
    );
  });

  const activeSectionData = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div className="space-y-4 font-sans max-w-6xl mx-auto pb-10">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-[#174A7C] dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <span>MES Help Center &amp; Support</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Documentation, shopfloor operational procedures, track &amp; trace compliance, and technical support desk.
          </p>
        </div>

        {/* Search box */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Sidebar + Viewport */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Navigation Selector */}
        <div className="md:col-span-4 lg:col-span-4 space-y-1.5">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-2">
            Help Topics ({filteredSections.length})
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 sidebar-scrollbar">
            {filteredSections.map((sec) => {
              const isSelected = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left border cursor-pointer ${
                    isSelected
                      ? 'bg-[#174A7C] text-white border-[#174A7C] shadow-md shadow-[#174A7C]/20'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isSelected ? 'text-[#F5A623]' : 'text-slate-500 dark:text-slate-400'}>
                      {sec.icon}
                    </span>
                    <span className="truncate">{sec.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sec.badge}
                  </span>
                </button>
              );
            })}

            {filteredSections.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                No help topics found matching "{searchQuery}".
              </div>
            )}
          </div>
        </div>

        {/* Right Content Viewport */}
        <div className="md:col-span-8 lg:col-span-8">
          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-6 shadow-sm min-h-[480px]">
            {activeSectionData ? (
              <div className="space-y-4">
                {/* Topic Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-[#174A7C] dark:text-blue-400 flex items-center justify-center">
                      {activeSectionData.icon}
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {activeSectionData.title}
                      </h2>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Category: {activeSectionData.category}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 uppercase">
                    {activeSectionData.badge}
                  </span>
                </div>

                {/* Content body */}
                <div className="pt-1">{activeSectionData.content}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
