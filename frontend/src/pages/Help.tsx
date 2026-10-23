import React, { useState } from 'react';
import { HelpCircle, BookOpen, Calculator, Cpu, ShieldAlert, Network, Settings, Boxes, Users, CalendarDays, FileText } from 'lucide-react';

export default function Help() {
  const [activeSection, setActiveSection] = useState<string>('oee');

  const sections = [
    {
      id: 'oee',
      title: 'OEE Calculations',
      icon: <Calculator size={18} />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-650 dark:text-slate-300">
          <p>
            Overall Equipment Effectiveness (OEE) is the gold standard for measuring manufacturing productivity. 
            It is calculated by multiplying three factors:
          </p>
          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-xl font-mono text-xs space-y-2 text-slate-800 dark:text-slate-200 border dark:border-slate-850">
            <div>OEE % = Availability % × Performance % × Quality %</div>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
            <div>• Availability % = (Actual Run Time / Planned Production Time) × 100</div>
            <div>• Performance % = (Actual Output / (Actual Run Time × Ideal Cycle Rate)) × 100</div>
            <div>• Quality % = (Good Units Produced / Total Units Produced) × 100</div>
          </div>
          <p>
            The system tracks these metrics in real-time. For active production lines, the **Ideal Cycle Rate** is preset based on recipe master routing.
          </p>
        </div>
      ),
    },
    {
      id: 'monitoring',
      title: 'Shopfloor Machine Statuses',
      icon: <Cpu size={18} />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-650 dark:text-slate-300">
          <p>Machines across production lines are dynamically classified into 5 color-coded states:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>RUNNING: Actively processing work orders</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>IDLE: Active order loaded but machine stopped</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>BREAKDOWN: Active fault / unscheduled stop</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>SETUP: Active product/feeder changeover</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span>MAINTENANCE: Undergoing preventive audit</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'add-material',
      title: 'How to Add Materials',
      icon: <Boxes size={18} />,
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-slate-650 dark:text-slate-300">
          <p>To define a new Material Master Record in your catalog:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Navigate to the **Material Management** page in the sidebar menu.</li>
            <li>Click the **+ Add Material** button (available to Managers and Supervisors).</li>
            <li>Fill out the **Material Code** (e.g. `RM001`, `PK001`, or `FG001`) and **Material Name**.</li>
            <li>Select the **Material Type** and **Unit of Measure (UOM)** from their respective dropdown lists.</li>
            <li>Input the **Manufacturer** and **Qualified Vendor Partner** from the list of audited suppliers.</li>
            <li>Click **Save Material** to register the master definition.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'add-vendor',
      title: 'How to Add Vendors',
      icon: <Users size={18} />,
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-slate-650 dark:text-slate-300">
          <p>Audited vendors supply active ingredients and excipients. To add a vendor to the database:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Vendors are managed securely within your relational database schema to support audits.</li>
            <li>Open the database browser by navigating to **[http://localhost:8080](http://localhost:8080)**.</li>
            <li>Select system **PostgreSQL** and log in with your Admin credentials.</li>
            <li>Insert a record into the `vendors` table, providing a unique `vendor_code` and `vendor_name`.</li>
            <li>Once inserted, they instantly populate all vendor selectors inside your MES application.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'add-type-uom',
      title: 'How to Add Types & UOMs',
      icon: <ShieldAlert size={18} />,
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-slate-650 dark:text-slate-300">
          <p>Administrators can register new Material Types and Units of Measure (UOM) dynamically:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Log in with your **Admin** credentials and navigate to the **Admin Panel** in the sidebar.</li>
            <li>Select the **Material Types & UOM** tab.</li>
            <li>To add a Unit of Measure, enter a unique **UOM Code** (e.g. `L`) and **Full Name** (e.g. `Liters`), then click **Add UOM**.</li>
            <li>To add a Material Type, enter the **Type Code** (e.g. `SOLVENT`) and **Description**, then click **Add Material Type**.</li>
            <li>These inputs persist in PostgreSQL and immediately populate all master dropdown selectors.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'add-recipe',
      title: 'How to Add Recipes',
      icon: <FileText size={18} />,
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-slate-650 dark:text-slate-300">
          <p>Master Batch Recipes (MBR) drive compliant shopfloor execution:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Navigate to **Recipes & Formulas** and then click **+ Add New Recipe**.</li>
            <li>Select the target finished **Product SKU** and describe the master formula.</li>
            <li>In the **Bill of Materials (BOM)** section, select ingredients using the material code dropdown. The system automatically retrieves the matching Unit of Measure (UOM). Click **Add**.</li>
            <li>In the **Process Steps** section, select standard operation stages (e.g. Blending, Sifting) from the dropdown and write detailed operator instructions and critical parameters (CPP). Click **Add**.</li>
            <li>Click **Release Formula** and enter your e-signature password to authenticate and publish the recipe.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'add-campaign',
      title: 'How to Add Campaigns',
      icon: <CalendarDays size={18} />,
      content: (
        <div className="space-y-3 text-sm leading-relaxed text-slate-650 dark:text-slate-300">
          <p>Production campaigns group batch work orders. To schedule and release a campaign:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Navigate to the **Batch Records (Work Orders)** page.</li>
            <li>Click the **+ Create Batch Record** button.</li>
            <li>Select the published **Master Batch Recipe (MBR)** from the list of released formulas.</li>
            <li>Select the target **Production Line** (e.g. Tableting Line 1) where the batch will run.</li>
            <li>Specify the campaign **Target Quantity** and scheduled **Due Date**.</li>
            <li>Click **Release to Shopfloor** to dispatch the batch campaign to the Operator Station.</li>
          </ol>
        </div>
      ),
    }
  ];

  return (
    <div className="space-y-8 font-sans max-w-4xl">
      {/* Header */}
      <div className="flex flex-col justify-start items-start text-left">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="text-blue-500" /> MES User Help Center
        </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Guide to calculations, shopfloor statuses, and operational parameters</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left selector menu */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition text-left border ${
                activeSection === sec.id
                  ? 'bg-blue-600 text-white border-transparent shadow-lg shadow-blue-600/10'
                  : 'bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {sec.icon}
              {sec.title}
            </button>
          ))}
        </div>

        {/* Right content viewport */}
        <div className="industrial-card p-3 md:col-span-2 space-y-4">
          {(() => {
            const section = sections.find((s) => s.id === activeSection);
            if (!section) return null;
            return (
              <>
                <h3 className="text-lg font-bold dark:text-white flex items-center gap-2 pb-3 border-b dark:border-slate-700/50">
                  {section.icon} {section.title}
                </h3>
                <div>{section.content}</div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
