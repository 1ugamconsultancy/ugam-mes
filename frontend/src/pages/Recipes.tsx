/**
 * ============================================================================
 * FILE: frontend/src/pages/Recipes.tsx
 * ============================================================================
 * Manufacturing Execution System (MES) - Master Recipes & Engineering BOM Suite
 *
 * Fully integrated recipe authoring, multi-level Bill of Materials (BOM) management,
 * and versioned manufacturing process routing system.
 *
 * Key Capabilities:
 *  1. Master Recipe Management: Version-controlled batch formulations (Status: DRAFT, ACTIVE, ARCHIVED, SUPERSEDED)
 *     with automated revision tracking (Rev A -> Rev B).
 *  2. Bill of Materials (BOM) Multi-Level Tree: Hierarchical component definitions linking Raw Materials,
 *     Intermediates, and Finished Goods with scrap allowances and usage purposes.
 *  3. Routing & Critical Process Parameters (CPP): Step-by-step shopfloor routing with machine assignments,
 *     work centers, poka-yoke 2D QR verification gates, and weigh/dispense checkpoints.
 *  4. Regulatory Compliance: Built-in 21 CFR Part 11 dual-credential e-signatures and audit trail logging
 *     for recipe release and Engineering Change Orders (ECO).
 *
 * Compliance Standards:
 *  - 21 CFR Part 11 (Electronic Signatures & Records, §11.50, §11.200)
 *  - GAMP 5 Category 4 (Configured Software - Recipe & Parameter Life Cycle Management)
 *  - IATF 16949:2016 Clause 8.5.1 (Control of Production & Service Provision)
 *  - ISO 9001:2015 Clause 8.5.6 (Control of Changes)
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useShopfloorStore } from '../context/shopfloorStore';
import {
  BookOpen,
  Plus,
  ArrowRight,
  Lock,
  AlertTriangle,
  Layers,
  ListOrdered,
  CheckCircle,
  FileText,
  Trash2,
  GitBranch,
  Search,
  Box,
  Cpu,
  Wrench,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Maximize2,
  Archive,
  History,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
  X,
  QrCode
} from 'lucide-react';
import StlViewer from '../components/StlViewer';
import { getApiUrl } from '../config';

interface BomItem {
  line_no?: number;
  component_code?: string;
  material_code?: string;
  component_name?: string;
  component_type?: string;
  quantity: number;
  uom: string;
  purpose?: string;
  imagePath?: string;
  image_path?: string;
}

interface ProcessStep {
  step: number;
  operation_name?: string;
  name?: string;
  operation_code?: string;
  machine_code?: string;
  work_center?: string;
  instruction: string;
  cpp?: string;
  step_type?: 'STANDARD' | 'QR_VERIFICATION' | 'WEIGH_DISPENSE';
  target_component_sku?: string;
}

interface Recipe {
  id: string;
  recipeCode: string;
  recipeName: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED';
  product: { id: string; name: string; sku: string };
  bom: BomItem[];
  processInstructions: ProcessStep[];
  plannedYieldPct: number;
  masterFormula?: string;
  updatedAt?: string;
}

interface EngineeringBomRow {
  bom_id: string;
  parent_material: string;
  revision: string;
  effective_from: string;
  effective_to?: string;
  status: string;
  parent_name?: string;
  parent_image?: string;
  parent_type?: string;
  line_no: number;
  component_material: string;
  component_type?: string;
  qty: number;
  uom: string;
  component_name?: string;
  component_image?: string;
  purpose?: string;
}

const FALLBACK_MATERIALS = [
  { id: '1', materialCode: 'RM-ST-001', materialName: 'EN8 Steel Bar Ø25 mm', materialType: 'RAW_MATERIAL', uom: 'KG', imagePath: '/uploads/steel_bar_en8.jpg' },
  { id: '2', materialCode: 'RM-ST-002', materialName: 'Aluminium Rod Ø30 mm', materialType: 'RAW_MATERIAL', uom: 'KG', imagePath: '/uploads/aluminium_rod.jpg' },
  { id: '3', materialCode: 'RM-ST-003', materialName: 'NBR Rubber Compound', materialType: 'RAW_MATERIAL', uom: 'KG', imagePath: '/uploads/nbr_rubber.jpg' },
  { id: '4', materialCode: 'RM-ST-004', materialName: 'Copper Wire 2.5 mm', materialType: 'RAW_MATERIAL', uom: 'KG', imagePath: '/uploads/copper_wire.jpg' },
  { id: '5', materialCode: 'INT-001', materialName: 'Machined Steel Pin', materialType: 'INTERMEDIATE', uom: 'PCS', imagePath: '/uploads/machined_pin.jpg' },
  { id: '6', materialCode: 'INT-002', materialName: 'Heat Treated Pin', materialType: 'INTERMEDIATE', uom: 'PCS', imagePath: '/uploads/heat_treated_pin.jpg' },
  { id: '7', materialCode: 'INT-003', materialName: 'Rubber Seal', materialType: 'INTERMEDIATE', uom: 'PCS', imagePath: '/uploads/rubber_seal.jpg' },
  { id: '8', materialCode: 'FG-001', materialName: 'Automotive Control Pin', materialType: 'FINISHED_GOOD', uom: 'PCS', imagePath: '/uploads/control_pin.jpg' },
  { id: '9', materialCode: 'FG-002', materialName: 'Hydraulic Seal Assembly', materialType: 'FINISHED_GOOD', uom: 'PCS', imagePath: '/uploads/hydraulic_seal.jpg' }
];

const FALLBACK_RECIPES: Recipe[] = [
  {
    id: 'rec-001-b',
    recipeCode: 'RT-001',
    recipeName: 'Steel Pin Machining & Deburring',
    version: 'B',
    status: 'ACTIVE',
    plannedYieldPct: 98.2,
    product: { id: '30111111-0001-1111-1111-111111111111', sku: 'INT-001', name: 'Machined Steel Pin' },
    masterFormula: 'Machining of EN8 steel bar stock into precision pin on CNC lathe and deburring. Rev B includes optimized feed rate.',
    bom: [
      { component_code: 'RM-ST-001', component_name: 'EN8 Steel Bar Ø25 mm', component_type: 'RAW', quantity: 0.45, uom: 'KG', purpose: 'Standard component charge' },
      { component_code: 'RM-ST-001', component_name: 'EN8 Steel Bar (Scrap/Allowance)', component_type: 'RAW', quantity: 0.02, uom: 'KG', purpose: 'Standard component charge' }
    ],
    processInstructions: [
      { step: 1, operation_name: 'Raw Material Lot QR Verification', operation_code: 'QR-VERIFY', step_type: 'QR_VERIFICATION', target_component_sku: 'RM-ST-001', machine_code: 'BENCH-01', work_center: 'WC-INSP', instruction: 'Scan 2D QR Code on raw steel bar bundle (RM-ST-001) to verify heat certificate before loading onto band saw.', cpp: 'Scan Match: 100%, CoA: Approved' },
      { step: 2, operation_name: 'Cutting', operation_code: 'CUT', machine_code: 'CUT-01', work_center: 'WC-CUT', instruction: 'Cut EN8 steel bar into 120 mm blanks on CUT-01 band saw.', cpp: 'Length: 120 ± 0.5 mm' },
      { step: 3, operation_name: 'CNC Turning', operation_code: 'CNC-TURN', machine_code: 'CNC-01', work_center: 'WC-CNC', instruction: 'Turn outside diameter to 22.0 mm, face both ends and chamfer 1x45 deg.', cpp: 'OD: 22.0 ± 0.02 mm, Ra: 0.8 um' },
      { step: 4, operation_name: 'Deburring & Inspection', operation_code: 'DEBURR', machine_code: 'BENCH-01', work_center: 'WC-INSP', instruction: 'Vibratory deburr blanks and verify dimensional conformance using digital micrometers.', cpp: 'Burr height max 0.05 mm' }
    ]
  },
  {
    id: 'rec-001-a',
    recipeCode: 'RT-001',
    recipeName: 'Steel Pin Machining',
    version: 'A',
    status: 'ARCHIVED',
    plannedYieldPct: 97.5,
    product: { id: '30111111-0001-1111-1111-111111111111', sku: 'INT-001', name: 'Machined Steel Pin' },
    masterFormula: 'Initial baseline revision for EN8 bar turning.',
    bom: [
      { component_code: 'RM-ST-001', component_name: 'EN8 Steel Bar Ø25 mm', component_type: 'RAW', quantity: 0.45, uom: 'KG', purpose: 'Standard component charge' }
    ],
    processInstructions: [
      { step: 1, operation_name: 'Cutting', operation_code: 'CUT', machine_code: 'CUT-01', work_center: 'WC-CUT', instruction: 'Cut EN8 steel bar into 120 mm blanks on CUT-01 band saw.', cpp: 'Length: 120 ± 0.5 mm' }
    ]
  },
  {
    id: 'rec-002-b',
    recipeCode: 'RT-002',
    recipeName: 'Heat Treatment',
    version: 'B',
    status: 'ACTIVE',
    plannedYieldPct: 99.0,
    product: { id: '30111111-0002-1111-1111-111111111111', sku: 'INT-002', name: 'Heat Treated Pin' },
    masterFormula: 'Induction hardening and oil quenching of machined steel pins to achieve 45-48 HRC surface hardness.',
    bom: [
      { component_code: 'INT-001', component_name: 'Machined Steel Pin', component_type: 'INTERMEDIATE', quantity: 1, uom: 'PCS', purpose: 'Core Pin' }
    ],
    processInstructions: [
      { step: 1, operation_name: 'Hardening & Quenching', operation_code: 'HEAT', machine_code: 'FURN-01', work_center: 'WC-HEAT', instruction: 'Induction harden outer surface at 860 C then rapid quench in polymer oil.', cpp: 'Hardness: 45-48 HRC, Temp: 860 ± 10 C' },
      { step: 2, operation_name: 'Stress Tempering', operation_code: 'TEMPER', machine_code: 'FURN-01', work_center: 'WC-HEAT', instruction: 'Temper in electric oven at 220 C for 90 minutes to relieve internal stresses.', cpp: 'Temp: 220 ± 5 C, Time: 90 min' }
    ]
  },
  {
    id: 'rec-003-b',
    recipeCode: 'RT-003',
    recipeName: 'Rubber Moulding',
    version: 'B',
    status: 'ACTIVE',
    plannedYieldPct: 99.5,
    product: { id: '30111111-0003-1111-1111-111111111111', sku: 'INT-003', name: 'Rubber Seal' },
    masterFormula: 'Compression moulding and visual QA of NBR 70 Shore A hydraulic elastomer seals.',
    bom: [
      { component_code: 'RM-ST-003', component_name: 'NBR Rubber Compound', component_type: 'RAW', quantity: 0.08, uom: 'KG', purpose: 'Preform Charge' }
    ],
    processInstructions: [
      { step: 1, operation_name: 'Compression Moulding', operation_code: 'MOULD', machine_code: 'PRESS-01', work_center: 'WC-MOULD', instruction: 'Load 80 g preform into heated mould cavity at 175 C under 150 bar pressure for 3.5 min.', cpp: 'Temp: 175 ± 3 C, Press: 150 bar' }
    ]
  },
  {
    id: 'rec-004-a',
    recipeCode: 'RT-004',
    recipeName: 'Control Pin Assembly',
    version: 'A',
    status: 'ACTIVE',
    plannedYieldPct: 99.2,
    product: { id: '30111111-0004-1111-1111-111111111111', sku: 'FG-001', name: 'Automotive Control Pin' },
    masterFormula: 'Final multi-stage assembly of heat-treated control pin with high-tensile surface coating and 100% optical inspection.',
    bom: [
      { component_code: 'INT-002', component_name: 'Heat Treated Pin', component_type: 'INTERMEDIATE', quantity: 1, uom: 'PCS', purpose: 'Core Pin' }
    ],
    processInstructions: [
      { step: 1, operation_name: 'Final Assembly', operation_code: 'ASSY', machine_code: 'ASSY-01', work_center: 'WC-ASSY', instruction: 'Integrate hardened pin into chassis control bushing fixture.', cpp: 'Fit Clearance: 0.015 mm' }
    ]
  },
  {
    id: 'rec-005-a',
    recipeCode: 'RT-005',
    recipeName: 'Hydraulic Seal Assembly',
    version: 'A',
    status: 'ACTIVE',
    plannedYieldPct: 98.9,
    product: { id: '30111111-0005-1111-1111-111111111111', sku: 'FG-002', name: 'Hydraulic Seal Assembly' },
    masterFormula: 'Bonding and co-vulcanization of NBR rubber seal with reinforcement copper support wire for high pressure fluid resistance.',
    bom: [
      { component_code: 'INT-003', component_name: 'Rubber Seal', component_type: 'INTERMEDIATE', quantity: 1, uom: 'PCS', purpose: 'Elastomer Ring' },
      { component_code: 'RM-ST-004', component_name: 'Copper Wire 2.5 mm', component_type: 'RAW', quantity: 0.05, uom: 'KG', purpose: 'Locking Ring' }
    ],
    processInstructions: [
      { step: 1, operation_name: 'Ring Insertion', operation_code: 'INSERT', machine_code: 'ASSY-02', work_center: 'WC-ASSY', instruction: 'Insert shaped copper wire into inner elastomer groove using pneumatic press.', cpp: 'Press: 2.5 bar' }
    ]
  }
];

const INITIAL_BOM_ROWS: EngineeringBomRow[] = [
  {
    bom_id: 'BOM-001',
    parent_material: 'FG-001',
    revision: 'B',
    effective_from: '2026-09-10',
    effective_to: '',
    status: 'RELEASED',
    parent_name: 'Automotive Control Pin',
    parent_image: '/uploads/control_pin.jpg',
    parent_type: 'FINISHED',
    line_no: 10,
    component_material: 'INT-002',
    component_type: 'INTERMEDIATE',
    qty: 1.0,
    uom: 'PCS',
    component_name: 'Heat Treated Pin',
    component_image: '/uploads/heat_treated_pin.jpg',
    purpose: 'Core Hardened Pin'
  },
  {
    bom_id: 'BOM-001',
    parent_material: 'FG-001',
    revision: 'A',
    effective_from: '2026-01-01',
    effective_to: '2026-09-10',
    status: 'ARCHIVED',
    parent_name: 'Automotive Control Pin',
    parent_image: '/uploads/control_pin.jpg',
    parent_type: 'FINISHED',
    line_no: 10,
    component_material: 'INT-002',
    component_type: 'INTERMEDIATE',
    qty: 1.0,
    uom: 'PCS',
    component_name: 'Heat Treated Pin',
    component_image: '/uploads/heat_treated_pin.jpg',
    purpose: 'Core Hardened Pin'
  },
  {
    bom_id: 'BOM-002',
    parent_material: 'FG-002',
    revision: 'B',
    effective_from: '2026-09-10',
    effective_to: '',
    status: 'RELEASED',
    parent_name: 'Hydraulic Seal Assembly',
    parent_image: '/uploads/hydraulic_seal.jpg',
    parent_type: 'FINISHED',
    line_no: 10,
    component_material: 'INT-003',
    component_type: 'RAW',
    qty: 1.0,
    uom: 'PCS',
    component_name: 'Rubber Seal',
    component_image: '/uploads/rubber_seal.jpg',
    purpose: 'Elastomer Ring'
  },
  {
    bom_id: 'BOM-002',
    parent_material: 'FG-002',
    revision: 'B',
    effective_from: '2026-09-10',
    effective_to: '',
    status: 'RELEASED',
    parent_name: 'Hydraulic Seal Assembly',
    parent_image: '/uploads/hydraulic_seal.jpg',
    parent_type: 'FINISHED',
    line_no: 20,
    component_material: 'RM-ST-004',
    component_type: 'RAW',
    qty: 0.05,
    uom: 'KG',
    component_name: 'Copper Wire 2.5 mm',
    component_image: '/uploads/copper_wire.jpg',
    purpose: 'Locking Ring'
  },
  {
    bom_id: 'BOM-002',
    parent_material: 'FG-002',
    revision: 'A',
    effective_from: '2026-01-01',
    effective_to: '2026-09-10',
    status: 'ARCHIVED',
    parent_name: 'Hydraulic Seal Assembly',
    parent_image: '/uploads/hydraulic_seal.jpg',
    parent_type: 'FINISHED',
    line_no: 10,
    component_material: 'INT-003',
    component_type: 'INTERMEDIATE',
    qty: 1.0,
    uom: 'PCS',
    component_name: 'Rubber Seal',
    component_image: '/uploads/rubber_seal.jpg',
    purpose: 'Elastomer Ring'
  },
  {
    bom_id: 'BOM-002',
    parent_material: 'FG-002',
    revision: 'A',
    effective_from: '2026-01-01',
    effective_to: '2026-09-10',
    status: 'ARCHIVED',
    parent_name: 'Hydraulic Seal Assembly',
    parent_image: '/uploads/hydraulic_seal.jpg',
    parent_type: 'FINISHED',
    line_no: 20,
    component_material: 'RM-ST-004',
    component_type: 'RAW',
    qty: 0.05,
    uom: 'KG',
    component_name: 'Copper Wire 2.5 mm',
    component_image: '/uploads/copper_wire.jpg',
    purpose: 'Locking Ring'
  },
  {
    bom_id: 'BOM-003',
    parent_material: 'INT-001',
    revision: 'A',
    effective_from: '2026-01-01',
    effective_to: '',
    status: 'RELEASED',
    parent_name: 'Machined Steel Pin',
    parent_image: '/uploads/machined_pin.jpg',
    parent_type: 'INTERMEDIATE',
    line_no: 10,
    component_material: 'RM-ST-001',
    component_type: 'RAW',
    qty: 0.45,
    uom: 'KG',
    component_name: 'EN8 Steel Bar Ø25 mm',
    component_image: '/uploads/steel_bar_en8.jpg',
    purpose: 'Machining Blank'
  },
  {
    bom_id: 'BOM-003',
    parent_material: 'INT-001',
    revision: 'A',
    effective_from: '2026-01-01',
    effective_to: '',
    status: 'RELEASED',
    parent_name: 'Machined Steel Pin',
    parent_image: '/uploads/machined_pin.jpg',
    parent_type: 'INTERMEDIATE',
    line_no: 20,
    component_material: 'RM-ST-001',
    component_type: 'RAW',
    qty: 0.02,
    uom: 'KG',
    component_name: 'EN8 Steel Bar Ø25 mm',
    component_image: '/uploads/steel_bar_en8.jpg',
    purpose: 'Scrap Allowance'
  },
  {
    bom_id: 'BOM-004',
    parent_material: 'INT-002',
    revision: 'A',
    effective_from: '2026-01-01',
    effective_to: '',
    status: 'RELEASED',
    parent_name: 'Heat Treated Pin',
    parent_image: '/uploads/heat_treated_pin.jpg',
    parent_type: 'INTERMEDIATE',
    line_no: 10,
    component_material: 'INT-001',
    component_type: 'INTERMEDIATE',
    qty: 1.0,
    uom: 'PCS',
    component_name: 'Machined Steel Pin',
    component_image: '/uploads/machined_pin.jpg',
    purpose: 'Pre-treated Slug'
  },
  {
    bom_id: 'BOM-005',
    parent_material: 'INT-003',
    revision: 'A',
    effective_from: '2026-01-01',
    effective_to: '',
    status: 'RELEASED',
    parent_name: 'Rubber Seal',
    parent_image: '/uploads/rubber_seal.jpg',
    parent_type: 'INTERMEDIATE',
    line_no: 10,
    component_material: 'RM-ST-003',
    component_type: 'RAW',
    qty: 0.08,
    uom: 'KG',
    component_name: 'NBR Rubber Compound',
    component_image: '/uploads/nbr_rubber.jpg',
    purpose: 'Compression Preform'
  }
];

/**
 * Calculates the next sequential revision code string for recipes and engineering BOMs.
 * 
 * Supports:
 *  - Single-letter sequences ('A' -> 'B', 'B' -> 'C', etc.)
 *  - Numeric minor/major revisions ('1.0' -> '2.0')
 *  - Fallback fractional incrementation ('B.1')
 *
 * @function getNextRevisionStr
 * @param {string} [currentRev] - Current active revision identifier.
 * @returns {string} Incremented revision string suitable for Engineering Change Orders.
 */
function getNextRevisionStr(currentRev?: string): string {
  if (!currentRev) return 'B';
  const clean = currentRev.replace(/Rev\s*/i, '').trim();
  if (/^[A-Za-z]$/.test(clean)) {
    return String.fromCharCode(clean.toUpperCase().charCodeAt(0) + 1);
  }
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    return (num + 1.0).toFixed(1);
  }
  return `${clean}.1`;
}

/**
 * Master Recipes & Engineering BOM Management Page Component.
 *
 * Provides shopfloor engineers, plant managers, and quality auditors with a unified interface
 * to formulate master recipes, manage engineering BOMs, inspect 3D STL component models,
 * step through routing instructions, and execute 21 CFR Part 11 compliant digital authorizations.
 *
 * @component Recipes
 * @returns {JSX.Element} Interactive Recipe & BOM engineering workbench.
 */
export default function Recipes() {
  const token = useShopfloorStore((state) => state.token);
  const user = useShopfloorStore((state) => state.user);

  // Top Tabs: 'recipes' vs 'bom'
  const [activeTab, setActiveTab] = useState<'recipes' | 'bom'>('recipes');

  // Recipes & Formulation State
  const [recipes, setRecipes] = useState<Recipe[]>(FALLBACK_RECIPES);
  const [products, setProducts] = useState<any[]>([
    { id: '30111111-0004-1111-1111-111111111111', sku: 'FG-001', name: 'Automotive Control Pin' },
    { id: '30111111-0005-1111-1111-111111111111', sku: 'FG-002', name: 'Hydraulic Seal Assembly' },
    { id: '30111111-0001-1111-1111-111111111111', sku: 'INT-001', name: 'Machined Steel Pin' },
    { id: '30111111-0002-1111-1111-111111111111', sku: 'INT-002', name: 'Heat Treated Pin' },
    { id: '30111111-0003-1111-1111-111111111111', sku: 'INT-003', name: 'Rubber Seal' }
  ]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(FALLBACK_RECIPES[0]);
  const [recipeFilter, setRecipeFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<any[]>(FALLBACK_MATERIALS);

  // Engineering BOMs State
  const [bomRows, setBomRows] = useState<EngineeringBomRow[]>(INITIAL_BOM_ROWS);
  const [bomFilter, setBomFilter] = useState<'ALL' | 'RELEASED' | 'ARCHIVED'>('RELEASED');
  const [bomLoading, setBomLoading] = useState(false);
  const [bomSearch, setBomSearch] = useState('');
  const [selectedBomKey, setSelectedBomKey] = useState<string>('BOM-001_B');

  // Zoomed Image / STL Modal
  const [zoomedFile, setZoomedFile] = useState<string | null>(null);
  const [zoomedTitle, setZoomedTitle] = useState<string>('Component Preview');

  // ==================== MODALS STATE ====================
  // 1. Design New Recipe Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [formula, setFormula] = useState('');
  const [yieldPct, setYieldPct] = useState(99.0);
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [bomCode, setBomCode] = useState('RM-ST-001');
  const [bomQty, setBomQty] = useState(1);
  const [bomUom, setBomUom] = useState('KG');
  const [bomPurpose, setBomPurpose] = useState('Blank');
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [stepName, setStepName] = useState('');
  const [stepCode, setStepCode] = useState('CUT');
  const [stepMachine, setStepMachine] = useState('CUT-01');
  const [stepWc, setStepWc] = useState('WC-CUT');
  const [stepInst, setStepInst] = useState('');
  const [stepCpp, setStepCpp] = useState('');
  const [stepType, setStepType] = useState<'STANDARD' | 'QR_VERIFICATION' | 'WEIGH_DISPENSE'>('STANDARD');
  const [stepTargetSku, setStepTargetSku] = useState('');

  // 2. Revise Recipe Modal
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseCode, setReviseCode] = useState('');
  const [reviseName, setReviseName] = useState('');
  const [currentVersion, setCurrentVersion] = useState('A');
  const [newVersion, setNewVersion] = useState('B');
  const [reviseProductId, setReviseProductId] = useState('');
  const [reviseFormula, setReviseFormula] = useState('');
  const [reviseYieldPct, setReviseYieldPct] = useState(99.0);
  const [reviseReason, setReviseReason] = useState('');
  const [reviseBomItems, setReviseBomItems] = useState<BomItem[]>([]);
  const [reviseSteps, setReviseSteps] = useState<ProcessStep[]>([]);

  // 3. Create New BOM Modal
  const [showCreateBomModal, setShowCreateBomModal] = useState(false);
  const [newBomId, setNewBomId] = useState('');
  const [newBomParentMat, setNewBomParentMat] = useState('FG-001');
  const [newBomRevision, setNewBomRevision] = useState('A');
  const [newBomComponents, setNewBomComponents] = useState<any[]>([]);

  // 4. Revise BOM Modal
  const [showReviseBomModal, setShowReviseBomModal] = useState(false);
  const [reviseBomId, setReviseBomId] = useState('');
  const [reviseBomParentMat, setReviseBomParentMat] = useState('');
  const [reviseBomParentName, setReviseBomParentName] = useState('');
  const [currentBomRev, setCurrentBomRev] = useState('A');
  const [newBomRev, setNewBomRev] = useState('B');
  const [reviseBomReason, setReviseBomReason] = useState('');
  const [reviseBomComponents, setReviseBomComponents] = useState<any[]>([]);

  // Right-side Accordion Section States for Recipe View
  const [recipeSections, setRecipeSections] = useState({
    formula: true,
    bom: true,
    routing: true,
    history: false
  });

  const toggleRecipeSection = (section: keyof typeof recipeSections) => {
    setRecipeSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAllRecipeSections = (open: boolean) => {
    setRecipeSections({ formula: open, bom: open, routing: open, history: open });
  };

  // Right-side Accordion Section States for BOM View
  const [bomSections, setBomSections] = useState({
    scope: true,
    bom: true,
    history: true
  });

  const toggleBomSection = (section: keyof typeof bomSections) => {
    setBomSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAllBomSections = (open: boolean) => {
    setBomSections({ scope: open, bom: open, history: open });
  };

  // Modal Component Form State
  const [modalCompCode, setModalCompCode] = useState('RM-ST-001');
  const [modalCompType, setModalCompType] = useState('RAW');
  const [modalCompQty, setModalCompQty] = useState(1);
  const [modalCompUom, setModalCompUom] = useState('KG');

  // Unified E-Signature Modal
  const [showSignModal, setShowSignModal] = useState(false);
  const [signActionType, setSignActionType] = useState<'CREATE_RECIPE' | 'REVISE_RECIPE' | 'CREATE_BOM' | 'REVISE_BOM'>('CREATE_RECIPE');
  const [signMeaning, setSignMeaning] = useState('');
  const [signUsername, setSignUsername] = useState(user?.username || 'admin');
  const [signPassword, setSignPassword] = useState('');
  const [showSignPassword, setShowSignPassword] = useState(false);
  const [signError, setSignError] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  /**
   * Fetches master recipes, product masters, raw material inventory items, and engineering BOMs
   * concurrently from the backend REST API with Bearer token authentication.
   *
   * @async
   * @function fetchAllData
   * @returns {Promise<void>}
   */
  const fetchAllData = async () => {
    setLoading(true);
    setBomLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [recRes, prodRes, matRes, bomRes] = await Promise.all([
        fetch(getApiUrl('/recipes'), { headers }).catch(() => null),
        fetch(getApiUrl('/recipes/products'), { headers }).catch(() => null),
        fetch(getApiUrl('/materials'), { headers }).catch(() => null),
        fetch(getApiUrl('/recipes/boms'), { headers }).catch(() => null)
      ]);

      if (recRes && recRes.ok) {
        const data = await recRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setRecipes(data);
          setSelectedRecipe((prev) => {
            if (!prev) return data[0];
            const found = data.find((r: Recipe) => r.id === prev.id);
            return found || data[0];
          });
        }
      }

      if (prodRes && prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData) && prodData.length > 0) {
          setProducts(prodData);
          if (!selectedProductId) setSelectedProductId(prodData[0].id);
        }
      }

      if (matRes && matRes.ok) {
        const matData = await matRes.json();
        if (Array.isArray(matData) && matData.length > 0) {
          setMaterials(matData);
          if (!bomCode) {
            setBomCode(matData[0].materialCode);
            setBomUom(matData[0].uom);
          }
          if (!newBomParentMat) setNewBomParentMat(matData[0].materialCode);
        }
      }

      if (bomRes && bomRes.ok) {
        const bomData = await bomRes.json();
        if (Array.isArray(bomData) && bomData.length > 0) {
          setBomRows(bomData);
        }
      }
    } catch (err) {
      console.error('Error loading recipes & BOM data:', err);
    } finally {
      setLoading(false);
      setBomLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  /**
   * Resolves a material or component SKU code to its registered human-readable catalog name.
   *
   * @function resolveComponentName
   * @param {string} [code] - Unique Material Master SKU or component code.
   * @returns {string} Material description name or fallback SKU string.
   */
  const resolveComponentName = (code?: string): string => {
    if (!code) return 'Component';
    const found = materials.find((m) => m.materialCode === code);
    return found?.materialName || code;
  };

  /**
   * Resolves a material SKU to its stored image thumbnail or 3D STL model URI.
   *
   * @function resolveComponentImage
   * @param {string} [code] - Unique Material Master SKU or component code.
   * @returns {string | undefined} Relative or absolute image/STL path.
   */
  const resolveComponentImage = (code?: string): string | undefined => {
    if (!code) return undefined;
    const found = materials.find((m) => m.materialCode === code);
    return found?.imagePath;
  };

  // Filter recipes based on filter toggle
  const filteredRecipes = useMemo(() => {
    if (recipeFilter === 'ACTIVE') {
      return recipes.filter((r) => r.status === 'ACTIVE');
    }
    if (recipeFilter === 'ARCHIVED') {
      return recipes.filter((r) => r.status === 'ARCHIVED' || r.status === 'SUPERSEDED');
    }
    return recipes;
  }, [recipes, recipeFilter]);

  const activeRecipeCount = useMemo(() => recipes.filter((r) => r.status === 'ACTIVE').length, [recipes]);
  const archivedRecipeCount = useMemo(() => recipes.filter((r) => r.status === 'ARCHIVED' || r.status === 'SUPERSEDED').length, [recipes]);

  // All revisions for currently selected recipe code
  const currentRecipeRevisions = useMemo(() => {
    if (!selectedRecipe) return [];
    return recipes.filter((r) => r.recipeCode === selectedRecipe.recipeCode);
  }, [recipes, selectedRecipe]);

  // ==================== REVISE RECIPE HANDLER ====================
  /**
   * Prepares the Recipe Revision modal state by copying current active parameters,
   * calculating the next engineering revision string, and populating carried BOM/routing lines.
   *
   * @function openReviseRecipeModal
   * @returns {void}
   */
  const openReviseRecipeModal = () => {
    if (!selectedRecipe) return;
    setReviseCode(selectedRecipe.recipeCode);
    setReviseName(selectedRecipe.recipeName);
    setCurrentVersion(selectedRecipe.version || 'A');
    setNewVersion(getNextRevisionStr(selectedRecipe.version));
    setReviseProductId(selectedRecipe.product?.id || products[0]?.id || '');
    setReviseFormula(selectedRecipe.masterFormula || '');
    setReviseYieldPct(Number(selectedRecipe.plannedYieldPct) || 99.0);
    setReviseReason(`Engineering Revision ${getNextRevisionStr(selectedRecipe.version)}: Parameter optimization`);
    setReviseBomItems([...(selectedRecipe.bom || [])]);
    setReviseSteps([...(selectedRecipe.processInstructions || [])]);
    setShowReviseModal(true);
  };

  /**
   * Validates recipe revision metadata and dispatches the 21 CFR Part 11 electronic signature modal.
   *
   * @function triggerReviseRecipeSign
   * @param {React.FormEvent} e - Form submission event.
   * @returns {void}
   */
  const triggerReviseRecipeSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion) {
      alert('Please specify the new revision.');
      return;
    }
    setSignActionType('REVISE_RECIPE');
    setSignMeaning(`Authorize & Release Revision Rev ${newVersion} for Recipe ${reviseCode} (${reviseName}). Previous active revision (${currentVersion}) will be archived.`);
    setSignUsername(user?.username || 'admin');
    setSignPassword('');
    setShowSignPassword(false);
    setSignError('');
    setShowSignModal(true);
  };

  // ==================== REVISE BOM HANDLER ====================
  /**
   * Pre-populates the Engineering Change Order (ECO) BOM revision modal with existing parent
   * assembly data, component charges, and calculated revision codes.
   *
   * @function openReviseBomModal
   * @param {EngineeringBomRow} header - Active BOM header row.
   * @param {EngineeringBomRow[]} components - Associated child component line items.
   * @returns {void}
   */
  const openReviseBomModal = (header: EngineeringBomRow, components: EngineeringBomRow[]) => {
    setReviseBomId(header.bom_id);
    setReviseBomParentMat(header.parent_material);
    setReviseBomParentName(header.parent_name || header.parent_material);
    setCurrentBomRev(header.revision || 'A');
    setNewBomRev(getNextRevisionStr(header.revision));
    setReviseBomReason(`ECO: Revision ${getNextRevisionStr(header.revision)} component balance`);
    setReviseBomComponents(
      components.map((c, i) => ({
        line_no: c.line_no || (i + 1) * 10,
        component_material: c.component_material,
        component_name: c.component_name || resolveComponentName(c.component_material),
        component_type: c.component_type || 'RAW',
        qty: Number(c.qty) || 1.0,
        uom: c.uom || 'PCS'
      }))
    );
    setShowReviseBomModal(true);
  };

  /**
   * Validates BOM revision entries and triggers the 21 CFR Part 11 electronic signature modal.
   *
   * @function triggerReviseBomSign
   * @param {React.FormEvent} e - Form submission event.
   * @returns {void}
   */
  const triggerReviseBomSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBomRev) {
      alert('Please specify the new BOM revision.');
      return;
    }
    if (reviseBomComponents.length === 0) {
      alert('BOM must have at least one component line.');
      return;
    }
    setSignActionType('REVISE_BOM');
    setSignMeaning(`Authorize & Release Revision Rev ${newBomRev} for Engineering BOM ${reviseBomId} (${reviseBomParentMat}). Previous revision (${currentBomRev}) will be archived.`);
    setSignUsername(user?.username || 'admin');
    setSignPassword('');
    setShowSignPassword(false);
    setSignError('');
    setShowSignModal(true);
  };

  // ==================== CREATE NEW RECIPE HANDLER ====================
  /**
   * Validates initial recipe creation parameters and prepares the electronic signature prompt.
   *
   * @function triggerCreateRecipeSign
   * @param {React.FormEvent} e - Form submission event.
   * @returns {void}
   */
  const triggerCreateRecipeSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) {
      alert('Please fill out Recipe Code and Name.');
      return;
    }
    setSignActionType('CREATE_RECIPE');
    setSignMeaning(`Authorize & Release initial Master Recipe: ${code} (${name})`);
    setSignUsername(user?.username || 'admin');
    setSignPassword('');
    setShowSignPassword(false);
    setSignError('');
    setShowSignModal(true);
  };

  // ==================== CREATE NEW BOM HANDLER ====================
  /**
   * Validates new Engineering BOM header fields and invokes the electronic signature dialog.
   *
   * @function triggerCreateBomSign
   * @param {React.FormEvent} e - Form submission event.
   * @returns {void}
   */
  const triggerCreateBomSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBomId || !newBomParentMat) {
      alert('Please specify BOM ID and Parent Material.');
      return;
    }
    if (newBomComponents.length === 0) {
      alert('Please add at least one component to the BOM.');
      return;
    }
    setSignActionType('CREATE_BOM');
    setSignMeaning(`Authorize & Release initial Engineering BOM: ${newBomId} (Parent: ${newBomParentMat})`);
    setSignUsername(user?.username || 'admin');
    setSignPassword('');
    setShowSignPassword(false);
    setSignError('');
    setShowSignModal(true);
  };

  // ==================== UNIFIED E-SIGNATURE EXECUTION ====================
  /**
   * Executes dual-factor re-authentication against the regulatory `/compliance/sign` endpoint
   * in accordance with 21 CFR Part 11 §11.200, followed by dispatching the corresponding
   * recipe or BOM lifecycle mutation (CREATE_RECIPE, REVISE_RECIPE, CREATE_BOM, REVISE_BOM).
   *
   * @async
   * @function handleConfirmSignature
   * @param {React.FormEvent} e - Form submission event.
   * @returns {Promise<void>}
   */
  const handleConfirmSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigning(true);
    setSignError('');

    try {
      // 1. Electronic signature re-verification (FDA 21 CFR Part 11)
      const signRes = await fetch(getApiUrl('/compliance/sign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: signUsername || user?.username || 'admin',
          password: signPassword,
          meaning: signMeaning
        })
      });

      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}));
        setSignError(err.message || 'Digital signature verification failed. Incorrect password.');
        setIsSigning(false);
        return;
      }

      // 2. Perform respective action
      if (signActionType === 'CREATE_RECIPE') {
        const res = await fetch(getApiUrl('/recipes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            productId: selectedProductId,
            recipeCode: code,
            recipeName: name,
            masterFormula: formula,
            bom: bomItems,
            processInstructions: steps,
            plannedYieldPct: yieldPct,
            status: 'ACTIVE'
          })
        });
        if (res.ok) {
          setShowSignModal(false);
          setShowCreateModal(false);
          setCode('');
          setName('');
          setFormula('');
          setBomItems([]);
          setSteps([]);
          await fetchAllData();
        } else {
          const err = await res.json().catch(() => ({}));
          setSignError(err.message || 'Failed to release recipe.');
        }
      } else if (signActionType === 'REVISE_RECIPE') {
        const res = await fetch(getApiUrl('/recipes/revise'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            productId: reviseProductId,
            recipeCode: reviseCode,
            recipeName: reviseName,
            newVersion: newVersion,
            masterFormula: reviseFormula,
            bom: reviseBomItems,
            processInstructions: reviseSteps,
            plannedYieldPct: reviseYieldPct,
            changeReason: reviseReason
          })
        });
        if (res.ok) {
          const revised = await res.json();
          setShowSignModal(false);
          setShowReviseModal(false);
          await fetchAllData();
          if (revised?.id) setSelectedRecipe(revised);
        } else {
          const err = await res.json().catch(() => ({}));
          setSignError(err.message || 'Failed to revise recipe.');
        }
      } else if (signActionType === 'CREATE_BOM') {
        const res = await fetch(getApiUrl('/recipes/boms'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            bom_id: newBomId,
            parent_material: newBomParentMat,
            revision: newBomRevision || 'A',
            components: newBomComponents,
            status: 'RELEASED'
          })
        });
        if (res.ok) {
          setShowSignModal(false);
          setShowCreateBomModal(false);
          setNewBomId('');
          setNewBomComponents([]);
          await fetchAllData();
        } else {
          const err = await res.json().catch(() => ({}));
          setSignError(err.message || 'Failed to create BOM.');
        }
      } else if (signActionType === 'REVISE_BOM') {
        const res = await fetch(getApiUrl('/recipes/boms/revise'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            bom_id: reviseBomId,
            parent_material: reviseBomParentMat,
            newRevision: newBomRev,
            components: reviseBomComponents,
            changeReason: reviseBomReason
          })
        });
        if (res.ok) {
          setShowSignModal(false);
          setShowReviseBomModal(false);
          await fetchAllData();
          setSelectedBomKey(`${reviseBomId}_${newBomRev}`);
        } else {
          const err = await res.json().catch(() => ({}));
          setSignError(err.message || 'Failed to revise BOM.');
        }
      }
    } catch (err: any) {
      setSignError(err.message || 'Signature authorization error.');
    } finally {
      setIsSigning(false);
    }
  };

  /**
   * Returns Tailwind styling badge classes corresponding to recipe/BOM release status.
   *
   * @function getStatusBadge
   * @param {string} [status] - Life cycle status ('ACTIVE' | 'RELEASED' | 'DRAFT' | 'ARCHIVED').
   * @returns {string} CSS utility class string.
   */
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'RELEASED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25';
      case 'DRAFT':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25';
      case 'ARCHIVED':
      case 'SUPERSEDED':
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700';
    }
  };

  /**
   * Returns Tailwind styling badge classes for component material classifications.
   *
   * @function getTypeBadge
   * @param {string} [type] - Component classification ('RAW' | 'INTERMEDIATE' | 'FINISHED').
   * @returns {string} CSS utility class string.
   */
  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'RAW':
      case 'RAW_MATERIAL':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25';
      case 'INTERMEDIATE':
      case 'SEMI_FINISHED':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25';
      case 'FINISHED':
      case 'FINISHED_GOOD':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25';
      default:
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700';
    }
  };

  // Group engineering BOM rows by Parent & Revision
  const groupedBoms = useMemo(() => {
    const groups: { [key: string]: { header: EngineeringBomRow; components: EngineeringBomRow[] } } = {};
    bomRows.forEach((row) => {
      const key = `${row.bom_id}_${row.revision}`;
      if (!groups[key]) {
        groups[key] = {
          header: row,
          components: []
        };
      }
      if (row.component_material) {
        groups[key].components.push(row);
      }
    });

    let list = Object.values(groups);

    // Filter by status
    if (bomFilter === 'RELEASED') {
      list = list.filter((g) => g.header.status === 'RELEASED');
    } else if (bomFilter === 'ARCHIVED') {
      list = list.filter((g) => g.header.status === 'ARCHIVED' || g.header.status === 'SUPERSEDED');
    }

    // Filter by search
    if (!bomSearch.trim()) return list;
    const term = bomSearch.toLowerCase();
    return list.filter((g) => {
      const matchParent =
        g.header.parent_material.toLowerCase().includes(term) ||
        g.header.parent_name?.toLowerCase().includes(term) ||
        g.header.bom_id.toLowerCase().includes(term);
      const matchComp = g.components.some(
        (c) =>
          c.component_material.toLowerCase().includes(term) ||
          c.component_name?.toLowerCase().includes(term)
      );
      return matchParent || matchComp;
    });
  }, [bomRows, bomFilter, bomSearch]);

  const activeBomCount = useMemo(() => {
    const uniqueIds = new Set(bomRows.filter((b) => b.status === 'RELEASED').map((b) => `${b.bom_id}_${b.revision}`));
    return uniqueIds.size;
  }, [bomRows]);

  const archivedBomCount = useMemo(() => {
    const uniqueIds = new Set(bomRows.filter((b) => b.status === 'ARCHIVED' || b.status === 'SUPERSEDED').map((b) => `${b.bom_id}_${b.revision}`));
    return uniqueIds.size;
  }, [bomRows]);

  const totalBomCount = useMemo(() => {
    const uniqueIds = new Set(bomRows.map((b) => `${b.bom_id}_${b.revision}`));
    return uniqueIds.size;
  }, [bomRows]);

  // Selected BOM Group
  const selectedBomGroup = useMemo(() => {
    if (groupedBoms.length === 0) return null;
    const found = groupedBoms.find(g => `${g.header.bom_id}_${g.header.revision}` === selectedBomKey);
    return found || groupedBoms[0];
  }, [groupedBoms, selectedBomKey]);

  // All revisions for selected BOM ID
  const allBomRevisions = useMemo(() => {
    if (!selectedBomGroup) return [];
    const groups: { [key: string]: { header: EngineeringBomRow; components: EngineeringBomRow[] } } = {};
    bomRows.filter(b => b.bom_id === selectedBomGroup.header.bom_id).forEach(row => {
      const key = `${row.bom_id}_${row.revision}`;
      if (!groups[key]) {
        groups[key] = { header: row, components: [] };
      }
      if (row.component_material) {
        groups[key].components.push(row);
      }
    });
    return Object.values(groups);
  }, [bomRows, selectedBomGroup]);

  return (
    <div className="space-y-2.5 font-sans p-3 md:p-4 max-w-[1700px] mx-auto h-[calc(100vh-76px)] flex flex-col overflow-hidden">
      {/* ========================================================================= */}
      {/* SECTION 1: HEADER & PRIMARY TAB CONTROLS                                  */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1F3A5C] pb-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Recipes & Bill of Materials (BOM)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25">
              GAMP 5 / IATF 16949
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maintain version-controlled Master Batch Formulas, visual component Bill of Materials (BOM), and critical process parameters (CPP).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Switcher Segmented Button Cards */}
          <div className="bg-slate-100 dark:bg-[#102237] p-1.5 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex items-center gap-1.5 shadow-inner">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                activeTab === 'recipes' ? 'bg-[#174A7C] text-white shadow-md ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/40 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:bg-slate-50 dark:hover:bg-[#1A365D] hover:border-[#174A7C] dark:hover:border-blue-400 hover:text-[#174A7C] dark:hover:text-white hover:shadow-sm'
              }`}
            >
              <FileText size={14} className={activeTab === 'recipes' ? 'text-white dark:text-[#F5A623]' : 'text-slate-500 dark:text-slate-400'} />
              <span>Master Recipes</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'recipes' ? 'bg-white/20 text-white font-extrabold' : 'bg-slate-100 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
              }`}>
                {recipes.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('bom')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                activeTab === 'bom' ? 'bg-[#174A7C] text-white shadow-md ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/40 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:bg-slate-50 dark:hover:bg-[#1A365D] hover:border-[#174A7C] dark:hover:border-blue-400 hover:text-[#174A7C] dark:hover:text-white hover:shadow-sm'
              }`}
            >
              <Layers size={14} className={activeTab === 'bom' ? 'text-white dark:text-[#F5A623]' : 'text-slate-500 dark:text-slate-400'} />
              <span>Engineering BOMs</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'bom' ? 'bg-white/20 text-white font-extrabold' : 'bg-slate-100 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
              }`}>
                {groupedBoms.length}
              </span>
            </button>
          </div>

          <button
            onClick={fetchAllData}
            title="Refresh Catalog"
            className="h-9 w-9 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-[#1F3A5C] rounded-lg bg-white dark:bg-[#102237] transition flex-shrink-0 cursor-pointer"
          >
            <RefreshCw size={15} className={loading || bomLoading ? 'animate-spin' : ''} />
          </button>

          {/* Context-aware primary creation button */}
          {user?.role !== 'OPERATOR' && (
            <button
              onClick={() => {
                if (activeTab === 'recipes') {
                  if (products.length > 0 && !selectedProductId) setSelectedProductId(products[0].id);
                  setShowCreateModal(true);
                } else {
                  setNewBomId(`BOM-00${bomRows.length + 1}`);
                  if (materials.length > 0 && !newBomParentMat) setNewBomParentMat(materials[0].materialCode);
                  setNewBomComponents([]);
                  setShowCreateBomModal(true);
                }
              }}
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold h-9 px-3.5 rounded text-xs transition shadow-sm cursor-pointer flex-shrink-0"
            >
              <Plus size={15} />
              <span>{activeTab === 'recipes' ? 'Create New Recipe' : 'Create New BOM'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MASTER RECIPES & FORMULATION                                      */}
      {/* ========================================================================= */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Recipe Selection List with Status Filters */}
          <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm rounded-xl p-3.5 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#1F3A5C] flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitBranch size={16} className="text-blue-500" /> Master Recipes
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-[#1F3A5C]">
                {filteredRecipes.length} Listed
              </span>
            </div>

            {/* Segmented Button Filter Cards: Active / Archived / All */}
            <div className="bg-slate-100 dark:bg-[#102237] p-1 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex items-center gap-1 shadow-inner text-[11px] font-bold flex-shrink-0 my-2">
              <button
                onClick={() => setRecipeFilter('ACTIVE')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                  recipeFilter === 'ACTIVE' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-emerald-500/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
                }`}
              >
                <span>Active</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  recipeFilter === 'ACTIVE'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
                }`}>
                  {activeRecipeCount}
                </span>
              </button>
              <button
                onClick={() => setRecipeFilter('ARCHIVED')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                  recipeFilter === 'ARCHIVED' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-amber-500/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
                }`}
              >
                <span>Archived</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  recipeFilter === 'ARCHIVED'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
                }`}>
                  {archivedRecipeCount}
                </span>
              </button>
              <button
                onClick={() => setRecipeFilter('ALL')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                  recipeFilter === 'ALL' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
                }`}
              >
                <span>All</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  recipeFilter === 'ALL'
                    ? 'bg-blue-100 dark:bg-[#102237] text-blue-700 dark:text-[#F5A623]'
                    : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
                }`}>
                  {recipes.length}
                </span>
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2 flex-1">
                <RefreshCw size={18} className="animate-spin text-blue-500" />
                Loading versioned master recipes...
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-[#1F3A5C] rounded-lg flex-1 flex items-center justify-center">
                No {recipeFilter.toLowerCase()} recipes registered.
              </div>
            ) : (
              <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1.5 mes-scrollbar">
                {filteredRecipes.map((rec) => {
                  const isSelected = selectedRecipe?.id === rec.id;
                  const thumb = resolveComponentImage(rec.product?.sku);
                  const isArchived = rec.status === 'ARCHIVED' || rec.status === 'SUPERSEDED';

                  return (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedRecipe(rec)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? isArchived
                            ? 'bg-slate-100 dark:bg-[#102237] border-slate-400 shadow-sm ring-1 ring-slate-400/50'
                            : 'bg-blue-50/80 dark:bg-[#102237] border-blue-500 shadow-sm ring-1 ring-blue-500/50'
                          : 'border-slate-200 dark:border-[#1F3A5C]/60 hover:bg-slate-50 dark:hover:bg-[#102237]/40'
                      }`}
                    >
                      {/* Product Thumbnail */}
                      <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {thumb ? (
                          <img src={thumb.startsWith('http') ? thumb : getApiUrl(thumb)} alt={rec.recipeCode} className="w-full h-full object-cover" />
                        ) : (
                          <Box size={18} className="text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                            {rec.recipeCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(rec.status)}`}>
                            {rec.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {rec.recipeName}
                        </h4>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          <span className="font-mono truncate max-w-[120px]">SKU: {rec.product?.sku || 'N/A'}</span>
                          <span className="font-semibold px-1.5 py-0.5 bg-slate-100 dark:bg-[#102237] rounded text-[9px] border border-slate-200 dark:border-[#1F3A5C]">
                            Rev {rec.version}
                          </span>
                        </div>
                      </div>

                      {/* Small arrow indicator for selected recipe */}
                      {isSelected && (
                        <div className="shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400 pl-1 self-center" title="Active selection details displayed on right">
                          <ArrowRight size={15} className="stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Master Recipe & Process Routing */}
          <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
            {selectedRecipe ? (
              <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm rounded-xl p-4 flex flex-col h-full overflow-hidden">
                {/* Archived Warning Banner if viewing historical recipe */}
                {(selectedRecipe.status === 'ARCHIVED' || selectedRecipe.status === 'SUPERSEDED') && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs flex items-center justify-between flex-shrink-0 mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="flex-shrink-0" />
                      <span>
                        <strong>ARCHIVED REVISION:</strong> You are viewing an archived revision (Rev {selectedRecipe.version}) preserved for historical audit traceability (GAMP 5 / 21 CFR Part 11).
                      </span>
                    </div>
                    {currentRecipeRevisions.find((r) => r.status === 'ACTIVE') && (
                      <button
                        onClick={() => {
                          const act = currentRecipeRevisions.find((r) => r.status === 'ACTIVE');
                          if (act) setSelectedRecipe(act);
                        }}
                        className="text-xs font-bold underline hover:text-amber-300 ml-2 cursor-pointer flex-shrink-0"
                      >
                        Switch to Active (Rev {currentRecipeRevisions.find((r) => r.status === 'ACTIVE')?.version})
                      </button>
                    )}
                  </div>
                )}

                {/* Recipe Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F3A5C] gap-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {/* Target Part Image with Click-to-Zoom */}
                    <div
                      onClick={() => {
                        const img = resolveComponentImage(selectedRecipe.product?.sku);
                        if (img) {
                          setZoomedFile(img);
                          setZoomedTitle(`${selectedRecipe.product?.name} (${selectedRecipe.product?.sku})`);
                        }
                      }}
                      className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-zoom-in hover:border-blue-500 transition group relative shadow-sm"
                      title="Click to inspect high-resolution part"
                    >
                      {resolveComponentImage(selectedRecipe.product?.sku) ? (
                        <div className="relative w-full h-full">
                          <img
                            src={
                              resolveComponentImage(selectedRecipe.product?.sku)!.startsWith('http')
                                ? resolveComponentImage(selectedRecipe.product?.sku)
                                : getApiUrl(resolveComponentImage(selectedRecipe.product?.sku)!)
                            }
                            alt={selectedRecipe.recipeCode}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Maximize2 size={13} className="text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <Box size={22} className="text-slate-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {selectedRecipe.recipeCode}
                        </span>
                        <h2 className="text-sm font-bold dark:text-white text-slate-900 truncate max-w-[280px]">
                          {selectedRecipe.recipeName}
                        </h2>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300 rounded font-mono text-[10px] font-bold border border-slate-200 dark:border-[#1F3A5C]">
                          Rev {selectedRecipe.version}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Target Part / Assembly: <strong className="text-slate-800 dark:text-slate-200">{selectedRecipe.product?.name || 'Assembly Target'}</strong> ({selectedRecipe.product?.sku})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                    {/* Planned Yield & Status Card */}
                    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#102237] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#1F3A5C]">
                      <div className="text-left md:text-right">
                        <span className="text-[8px] block font-bold text-slate-400 uppercase tracking-wider">Planned Yield</span>
                        <span className="text-xs font-bold text-emerald-500">{selectedRecipe.plannedYieldPct}%</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200 dark:bg-[#1F3A5C]" />
                      <div className="text-left md:text-right">
                        <span className="text-[8px] block font-bold text-slate-400 uppercase tracking-wider">Status</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getStatusBadge(selectedRecipe.status)}`}>
                          {selectedRecipe.status}
                        </span>
                      </div>
                    </div>

                    {/* Revise Recipe Action Button - Material Management Styling */}
                    {user?.role !== 'OPERATOR' && selectedRecipe.status === 'ACTIVE' && (
                      <button
                        onClick={openReviseRecipeModal}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-1.5 px-3 rounded text-xs transition shadow-sm cursor-pointer"
                        title="Create new revision of this recipe. Older version will be archived."
                      >
                        <Edit3 size={13} className="text-white" /> Revise Recipe
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Controls Toolbar */}
                <div className="flex justify-between items-center py-2 text-[11px] text-slate-400 flex-shrink-0">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs">Technical Formulation & Process Architecture</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => toggleAllRecipeSections(true)}
                      className="hover:text-blue-500 text-slate-400 transition cursor-pointer font-medium"
                    >
                      Expand All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => toggleAllRecipeSections(false)}
                      className="hover:text-blue-500 text-slate-400 transition cursor-pointer font-medium"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Scrollable Accordions Container */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 mes-scrollbar">
                  {/* Accordion 1: Master Formulation & Scope of Work */}
                  <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                    <button
                      type="button"
                      onClick={() => toggleRecipeSection('formula')}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <FileText size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Master Formulation & Scope of Work
                          </h4>
                          <p className="text-[10px] text-slate-400">Core manufacturing specifications & parameters</p>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                          recipeSections.formula ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                    {recipeSections.formula && (
                      <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                        <div className="max-h-36 overflow-y-auto mes-scrollbar mt-2.5">
                          <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-[#102237] p-3 rounded-lg border border-slate-200 dark:border-[#1F3A5C] leading-relaxed font-sans">
                            {selectedRecipe.masterFormula || 'No formula text registered.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Bill of Materials (BOM) Component Charges */}
                  <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                    <button
                      type="button"
                      onClick={() => toggleRecipeSection('bom')}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Layers size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Bill of Materials (BOM) Component Charges
                          </h4>
                          <p className="text-[10px] text-slate-400">Raw materials, intermediate parts & consumable hardware</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border dark:border-[#1F3A5C]">
                          {selectedRecipe.bom?.length || 0} component{(selectedRecipe.bom?.length || 0) === 1 ? '' : 's'}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            recipeSections.bom ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </div>
                    </button>
                    {recipeSections.bom && (
                      <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                        <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-[#1F3A5C] mt-2.5 mes-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 dark:bg-[#102237] text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-[#1F3A5C] sticky top-0 z-10 backdrop-blur-sm">
                              <tr>
                                <th className="py-2 px-3">Preview</th>
                                <th className="py-2 px-3">Component Code</th>
                                <th className="py-2 px-3">Component Description</th>
                                <th className="py-2 px-3">Type</th>
                                <th className="py-2 px-3 text-right">Qty</th>
                                <th className="py-2 px-3">UOM</th>
                                <th className="py-2 px-3">Usage / Purpose</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1F3A5C]/60 font-sans">
                              {(!selectedRecipe.bom || selectedRecipe.bom.length === 0) ? (
                                <tr>
                                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                                    No components linked to this formula.
                                  </td>
                                </tr>
                              ) : (
                                selectedRecipe.bom.map((b, i) => {
                                  const compCode = b.component_code || b.material_code;
                                  const compImg = b.imagePath || b.image_path || resolveComponentImage(compCode);
                                  const isStl = compImg?.toLowerCase().endsWith('.stl');
                                  return (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-[#102237]/50 transition">
                                      <td className="py-1.5 px-3">
                                        <div
                                          onClick={() => {
                                            if (compImg) {
                                              setZoomedFile(compImg);
                                              setZoomedTitle(`${b.component_name || resolveComponentName(compCode)} (${compCode})`);
                                            }
                                          }}
                                          className={`w-8 h-8 rounded bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex items-center justify-center overflow-hidden flex-shrink-0 ${
                                            compImg ? 'cursor-zoom-in hover:border-blue-500 group relative' : ''
                                          }`}
                                        >
                                          {compImg ? (
                                            isStl ? (
                                              <span className="text-[10px] font-bold text-blue-500">3D</span>
                                            ) : (
                                              <>
                                                <img
                                                  src={compImg.startsWith('http') ? compImg : getApiUrl(compImg)}
                                                  alt={compCode}
                                                  className="w-full h-full object-cover group-hover:scale-110 transition duration-150"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                  <Maximize2 size={10} className="text-white drop-shadow" />
                                                </div>
                                              </>
                                            )
                                          ) : (
                                            <Box size={14} className="text-slate-400" />
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                                        {compCode}
                                      </td>
                                      <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200 text-xs">
                                        {b.component_name || resolveComponentName(compCode)}
                                      </td>
                                      <td className="py-1.5 px-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getTypeBadge(b.component_type)}`}>
                                          {b.component_type || 'RAW'}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-right text-emerald-500 text-xs">
                                        {Number(b.quantity).toFixed(4).replace(/\.?0+$/, '')}
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-500 text-[11px] font-mono">
                                        {b.uom}
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                                        {b.purpose || 'Standard component charge'}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 3: Manufacturing Routing & Process Instructions */}
                  <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                    <button
                      type="button"
                      onClick={() => toggleRecipeSection('routing')}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <ListOrdered size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Manufacturing Routing & Process Instructions
                          </h4>
                          <p className="text-[10px] text-slate-400">Step-by-step shopfloor routing & Critical Process Parameters (CPP)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border dark:border-[#1F3A5C]">
                          {selectedRecipe.processInstructions?.length || 0} step{(selectedRecipe.processInstructions?.length || 0) === 1 ? '' : 's'}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            recipeSections.routing ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </div>
                    </button>
                    {recipeSections.routing && (
                      <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                        {(!selectedRecipe.processInstructions || selectedRecipe.processInstructions.length === 0) ? (
                          <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-[#1F3A5C] rounded-lg mt-2.5">
                            No routing instructions defined.
                          </div>
                        ) : (
                          <div className="space-y-2 mt-2.5 max-h-56 overflow-y-auto pr-1 mes-scrollbar">
                            {selectedRecipe.processInstructions.map((p, idx) => (
                              <div
                                key={idx}
                                className="bg-white dark:bg-[#102237] p-2.5 rounded-lg border border-slate-200 dark:border-[#1F3A5C] flex items-start gap-2.5"
                              >
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                                  {p.step || idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                                      {p.operation_name || p.name || `Operation ${p.step}`}
                                    </h4>
                                    {p.operation_code && (
                                      <span className="font-mono text-[9px] text-slate-400 font-semibold uppercase bg-slate-100 dark:bg-[#142A45] px-2 py-0.5 rounded border dark:border-[#1F3A5C]">
                                        {p.operation_code}
                                      </span>
                                    )}
                                    {p.work_center && (
                                      <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                        🏢 {p.work_center}
                                      </span>
                                    )}
                                    {p.machine_code && (
                                      <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                        🔑 {p.machine_code}
                                      </span>
                                    )}
                                    {p.step_type === 'QR_VERIFICATION' && (
                                      <span className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                        <QrCode size={11} />
                                        <span>2D QR VERIFY {p.target_component_sku ? `(${p.target_component_sku})` : ''}</span>
                                      </span>
                                    )}
                                    {p.step_type === 'WEIGH_DISPENSE' && (
                                      <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                        <QrCode size={11} />
                                        <span>WEIGH & DISPENSE QR</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                                    {p.instruction}
                                  </p>
                                  {p.cpp && (
                                    <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-500 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 w-fit">
                                      <ShieldCheck size={11} />
                                      <strong>CPP:</strong> {p.cpp}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Accordion 4: Revision History & Audit Trail */}
                  <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                    <button
                      type="button"
                      onClick={() => toggleRecipeSection('history')}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <History size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Revision History & Audit Trail (GAMP 5 / 21 CFR Part 11)
                          </h4>
                          <p className="text-[10px] text-slate-400">Historical recipe revisions & superseded versions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border dark:border-[#1F3A5C]">
                          {currentRecipeRevisions.length} revision{currentRecipeRevisions.length === 1 ? '' : 's'}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            recipeSections.history ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </div>
                    </button>
                    {recipeSections.history && (
                      <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2.5 max-h-48 overflow-y-auto mes-scrollbar">
                          {currentRecipeRevisions.map((rev) => {
                            const isCurrent = rev.id === selectedRecipe.id;
                            const isRevArchived = rev.status === 'ARCHIVED' || rev.status === 'SUPERSEDED';
                            return (
                              <div
                                key={rev.id}
                                onClick={() => setSelectedRecipe(rev)}
                                className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                                  isCurrent
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-[#102237] shadow-sm ring-1 ring-blue-500/40'
                                    : 'border-slate-200 dark:border-[#1F3A5C]/60 hover:bg-slate-50 dark:hover:bg-[#102237]/40'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${isRevArchived ? 'bg-slate-500/10 text-slate-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {isRevArchived ? <Archive size={13} /> : <CheckCircle2 size={13} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                        Rev {rev.version}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${getStatusBadge(rev.status)}`}>
                                        {rev.status}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      Yield: {rev.plannedYieldPct}% | {rev.bom?.length || 0} BOM items
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-blue-500 font-bold">
                                  {isCurrent ? 'Viewing' : 'Select'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-[#1F3A5C] rounded-xl h-full flex items-center justify-center">
                No recipe selected. Select a versioned Master Recipe from the left list.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ENGINEERING BILL OF MATERIALS (BOM) HIERARCHY                     */}
      {/* (Exact 2-Column Master-Detail Layout Parity with Master Recipes)          */}
      {/* ========================================================================= */}
      {activeTab === 'bom' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left Column: BOM Selection List with Status Filters */}
          <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm rounded-xl p-3.5 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#1F3A5C] flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-blue-500" /> Engineering BOMs
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-[#1F3A5C]">
                {groupedBoms.length} Listed
              </span>
            </div>

            {/* Segmented Button Filter Cards: Active / Archived / All */}
            <div className="bg-slate-100 dark:bg-[#102237] p-1 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex items-center gap-1 shadow-inner text-[11px] font-bold flex-shrink-0 my-2">
              <button
                onClick={() => setBomFilter('RELEASED')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                  bomFilter === 'RELEASED' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-emerald-500/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
                }`}
              >
                <span>Active</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  bomFilter === 'RELEASED'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
                }`}>
                  {activeBomCount}
                </span>
              </button>
              <button
                onClick={() => setBomFilter('ARCHIVED')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                  bomFilter === 'ARCHIVED' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-amber-500/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
                }`}
              >
                <span>Archived</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  bomFilter === 'ARCHIVED'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
                }`}>
                  {archivedBomCount}
                </span>
              </button>
              <button
                onClick={() => setBomFilter('ALL')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                  bomFilter === 'ALL' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
                }`}
              >
                <span>All</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  bomFilter === 'ALL'
                    ? 'bg-blue-100 dark:bg-[#102237] text-blue-700 dark:text-[#F5A623]'
                    : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
                }`}>
                  {totalBomCount}
                </span>
              </button>
            </div>

            {/* Compact Search */}
            <div className="relative flex-shrink-0 mb-2">
              <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search BOM by code, assembly, part..."
                value={bomSearch}
                onChange={(e) => setBomSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {bomLoading && bomRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2 flex-1">
                <RefreshCw size={18} className="animate-spin text-blue-500" />
                Loading engineering BOMs...
              </div>
            ) : groupedBoms.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-[#1F3A5C] rounded-lg flex-1 flex items-center justify-center">
                No matching BOMs found.
              </div>
            ) : (
              <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1.5 mes-scrollbar">
                {groupedBoms.map((group) => {
                  const key = `${group.header.bom_id}_${group.header.revision}`;
                  const isSelected = selectedBomGroup ? `${selectedBomGroup.header.bom_id}_${selectedBomGroup.header.revision}` === key : false;
                  const parentImg = group.header.parent_image || resolveComponentImage(group.header.parent_material);
                  const isArchived = group.header.status === 'ARCHIVED' || group.header.status === 'SUPERSEDED';

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedBomKey(key)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? isArchived
                            ? 'bg-slate-100 dark:bg-[#102237] border-slate-400 shadow-sm ring-1 ring-slate-400/50'
                            : 'bg-blue-50/80 dark:bg-[#102237] border-blue-500 shadow-sm ring-1 ring-blue-500/50'
                          : 'border-slate-200 dark:border-[#1F3A5C]/60 hover:bg-slate-50 dark:hover:bg-[#102237]/40'
                      }`}
                    >
                      {/* Parent Part Thumbnail */}
                      <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {parentImg ? (
                          <img src={parentImg.startsWith('http') ? parentImg : getApiUrl(parentImg)} alt={group.header.bom_id} className="w-full h-full object-cover" />
                        ) : (
                          <Layers size={18} className="text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                            {group.header.bom_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(group.header.status)}`}>
                            {group.header.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {group.header.parent_name || group.header.parent_material}
                        </h4>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          <span className="font-mono truncate max-w-[120px]">Part: {group.header.parent_material}</span>
                          <span className="font-semibold px-1.5 py-0.5 bg-slate-100 dark:bg-[#102237] rounded text-[9px] border border-slate-200 dark:border-[#1F3A5C]">
                            Rev {group.header.revision}
                          </span>
                        </div>
                      </div>

                      {/* Small arrow indicator for selected BOM */}
                      {isSelected && (
                        <div className="shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400 pl-1 self-center" title="Active selection details displayed on right">
                          <ArrowRight size={15} className="stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Selected BOM (Exact Parity with Master Recipes) */}
          <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
            {selectedBomGroup ? (
              <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm rounded-xl p-4 flex flex-col h-full overflow-hidden">
                {/* Archived Warning Banner if applicable */}
                {(selectedBomGroup.header.status === 'ARCHIVED' || selectedBomGroup.header.status === 'SUPERSEDED') && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs flex items-center justify-between flex-shrink-0 mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="flex-shrink-0" />
                      <span>
                        <strong>ARCHIVED REVISION:</strong> You are viewing an archived revision (Rev {selectedBomGroup.header.revision}) of this Engineering BOM, preserved for historical audit traceability (GAMP 5 / IATF 16949 / 21 CFR Part 11).
                      </span>
                    </div>
                    {allBomRevisions.find((r) => r.header.status === 'RELEASED') && (
                      <button
                        onClick={() => {
                          const act = allBomRevisions.find((r) => r.header.status === 'RELEASED');
                          if (act) setSelectedBomKey(`${act.header.bom_id}_${act.header.revision}`);
                        }}
                        className="text-xs font-bold underline hover:text-amber-300 ml-2 cursor-pointer flex-shrink-0"
                      >
                        Switch to Active (Rev {allBomRevisions.find((r) => r.header.status === 'RELEASED')?.header.revision})
                      </button>
                    )}
                  </div>
                )}

                {/* Top BOM Header Card */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F3A5C] gap-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {/* Parent Part Image with Click-to-Zoom */}
                    <div
                      onClick={() => {
                        const img = selectedBomGroup.header.parent_image || resolveComponentImage(selectedBomGroup.header.parent_material);
                        if (img) {
                          setZoomedFile(img);
                          setZoomedTitle(`${selectedBomGroup.header.parent_name || selectedBomGroup.header.parent_material} (${selectedBomGroup.header.parent_material})`);
                        }
                      }}
                      className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-zoom-in hover:border-blue-500 transition group relative shadow-sm"
                      title="Click to inspect parent assembly"
                    >
                      {selectedBomGroup.header.parent_image || resolveComponentImage(selectedBomGroup.header.parent_material) ? (
                        <div className="relative w-full h-full">
                          <img
                            src={
                              (selectedBomGroup.header.parent_image || resolveComponentImage(selectedBomGroup.header.parent_material))!.startsWith('http')
                                ? (selectedBomGroup.header.parent_image || resolveComponentImage(selectedBomGroup.header.parent_material))!
                                : getApiUrl((selectedBomGroup.header.parent_image || resolveComponentImage(selectedBomGroup.header.parent_material))!)
                            }
                            alt={selectedBomGroup.header.bom_id}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Maximize2 size={13} className="text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <Layers size={22} className="text-slate-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {selectedBomGroup.header.bom_id}
                        </span>
                        <h2 className="text-sm font-bold dark:text-white text-slate-900 truncate max-w-[280px]">
                          {selectedBomGroup.header.parent_name || selectedBomGroup.header.parent_material}
                        </h2>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300 rounded font-mono text-[10px] font-bold border border-slate-200 dark:border-[#1F3A5C]">
                          Rev {selectedBomGroup.header.revision}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Parent Assembly Part: <strong className="text-slate-800 dark:text-slate-200">{selectedBomGroup.header.parent_material}</strong>
                        {selectedBomGroup.header.parent_type && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getTypeBadge(selectedBomGroup.header.parent_type)}`}>
                            {selectedBomGroup.header.parent_type}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                    {/* Status & Component Count Card */}
                    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#102237] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#1F3A5C]">
                      <div className="text-left md:text-right">
                        <span className="text-[8px] block font-bold text-slate-400 uppercase tracking-wider">Components</span>
                        <span className="text-xs font-bold text-blue-500">{selectedBomGroup.components.length} Items</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200 dark:bg-[#1F3A5C]" />
                      <div className="text-left md:text-right">
                        <span className="text-[8px] block font-bold text-slate-400 uppercase tracking-wider">Status</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getStatusBadge(selectedBomGroup.header.status)}`}>
                          {selectedBomGroup.header.status}
                        </span>
                      </div>
                    </div>

                    {/* Revise BOM Action Button - Material Management Styling */}
                    {user?.role !== 'OPERATOR' && selectedBomGroup.header.status === 'RELEASED' && (
                      <button
                        onClick={() => openReviseBomModal(selectedBomGroup.header, selectedBomGroup.components)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-1.5 px-3 rounded text-xs transition shadow-sm cursor-pointer"
                        title="Create new revision of this BOM. Older version will be archived."
                      >
                        <Edit3 size={13} className="text-white" /> Revise BOM
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Controls Toolbar */}
                <div className="flex justify-between items-center py-2 text-[11px] text-slate-400 flex-shrink-0">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs">Engineering Hierarchy & Traceability</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => toggleAllBomSections(true)}
                      className="hover:text-blue-500 text-slate-400 transition cursor-pointer font-medium"
                    >
                      Expand All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => toggleAllBomSections(false)}
                      className="hover:text-blue-500 text-slate-400 transition cursor-pointer font-medium"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Scrollable Accordions Container */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 mes-scrollbar">
                  {/* Accordion 1: Engineering Scope & Parent Material Specification */}
                  <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                    <button
                      type="button"
                      onClick={() => toggleBomSection('scope')}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <FileText size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Engineering Scope & Assembly Specifications
                          </h4>
                          <p className="text-[10px] text-slate-400">IATF 16949 / GAMP 5 design change authorization rules</p>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                          bomSections.scope ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                    {bomSections.scope && (
                      <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                        <div className="max-h-36 overflow-y-auto mes-scrollbar mt-2.5">
                          <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-[#102237] p-3 rounded-lg border border-slate-200 dark:border-[#1F3A5C] leading-relaxed font-sans flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-200">
                                Multi-level Engineering Bill of Materials (BOM) for assembly target <strong>{selectedBomGroup.header.parent_material}</strong> ({selectedBomGroup.header.parent_name || 'Precision Assembly'}).
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Governed under IATF 16949 / GAMP 5 design change authorization rules. Revisions require electronic signature sign-off.
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-[11px] border-t md:border-t-0 md:border-l border-slate-200 dark:border-[#1F3A5C] pt-2 md:pt-0 md:pl-4 flex-shrink-0">
                              <div>
                                <span className="block text-slate-400 text-[10px] uppercase font-bold">Effective From</span>
                                <span className="font-mono font-semibold text-emerald-500">{selectedBomGroup.header.effective_from ? selectedBomGroup.header.effective_from.split('T')[0] : '2026-01-01'}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-[10px] uppercase font-bold">Effective To</span>
                                <span className="font-mono font-semibold text-slate-400">{selectedBomGroup.header.effective_to ? selectedBomGroup.header.effective_to.split('T')[0] : 'Current Active'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Bill of Materials (BOM) Component Charges Table */}
                  <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                    <button
                      type="button"
                      onClick={() => toggleBomSection('bom')}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Layers size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Bill of Materials (BOM) Component Charges
                          </h4>
                          <p className="text-[10px] text-slate-400">Multi-level assembly components & material bill</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border dark:border-[#1F3A5C]">
                          {selectedBomGroup.components.length} component{selectedBomGroup.components.length === 1 ? '' : 's'}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            bomSections.bom ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </div>
                    </button>
                    {bomSections.bom && (
                      <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                        <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-[#1F3A5C] mt-2.5 mes-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 dark:bg-[#102237] text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-[#1F3A5C] sticky top-0 z-10 backdrop-blur-sm">
                              <tr>
                                <th className="py-2 px-3">Preview</th>
                                <th className="py-2 px-3">Line</th>
                                <th className="py-2 px-3">Component Code</th>
                                <th className="py-2 px-3">Component Description</th>
                                <th className="py-2 px-3">Type</th>
                                <th className="py-2 px-3 text-right">Qty</th>
                                <th className="py-2 px-3">UOM</th>
                                <th className="py-2 px-3">Usage / Purpose</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1F3A5C]/60 font-sans">
                              {selectedBomGroup.components.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                                    No components registered for this BOM revision.
                                  </td>
                                </tr>
                              ) : (
                                selectedBomGroup.components.map((c, i) => {
                                  const compImg = c.component_image || resolveComponentImage(c.component_material);
                                  const isStl = compImg?.toLowerCase().endsWith('.stl');
                                  return (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-[#102237]/50 transition">
                                      <td className="py-1.5 px-3">
                                        <div
                                          onClick={() => {
                                            if (compImg) {
                                              setZoomedFile(compImg);
                                              setZoomedTitle(`${c.component_name || c.component_material} (${c.component_material})`);
                                            }
                                          }}
                                          className={`w-8 h-8 rounded bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex items-center justify-center overflow-hidden flex-shrink-0 ${
                                            compImg ? 'cursor-zoom-in hover:border-blue-500 group relative' : ''
                                          }`}
                                        >
                                          {compImg ? (
                                            isStl ? (
                                              <span className="text-[10px] font-bold text-blue-500">3D</span>
                                            ) : (
                                              <>
                                                <img
                                                  src={compImg.startsWith('http') ? compImg : getApiUrl(compImg)}
                                                  alt={c.component_material}
                                                  className="w-full h-full object-cover group-hover:scale-110 transition duration-150"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                  <Maximize2 size={10} className="text-white drop-shadow" />
                                                </div>
                                              </>
                                            )
                                          ) : (
                                            <Box size={14} className="text-slate-400" />
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-3 font-mono text-[11px] text-slate-400">
                                        #{c.line_no || (i + 1) * 10}
                                      </td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                                        {c.component_material}
                                      </td>
                                      <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200 text-xs">
                                        {c.component_name || resolveComponentName(c.component_material)}
                                      </td>
                                      <td className="py-1.5 px-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getTypeBadge(c.component_type)}`}>
                                          {c.component_type || 'RAW'}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-right text-emerald-500 text-xs">
                                        {Number(c.qty).toFixed(4).replace(/\.?0+$/, '')}
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-500 text-[11px] font-mono">
                                        {c.uom || 'PCS'}
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                                        {c.purpose || 'Standard component charge'}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 3: Revision History & Engineering Change Order (ECO) Chain */}
                  <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                    <button
                      type="button"
                      onClick={() => toggleBomSection('history')}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <History size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Revision History & Engineering Change Order (ECO) Chain
                          </h4>
                          <p className="text-[10px] text-slate-400">Traceable engineering revision lineage</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-[#102237] text-slate-700 dark:text-slate-300 border dark:border-[#1F3A5C]">
                          {allBomRevisions.length} revision{allBomRevisions.length === 1 ? '' : 's'}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            bomSections.history ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </div>
                    </button>
                    {bomSections.history && (
                      <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2.5 max-h-48 overflow-y-auto mes-scrollbar">
                          {allBomRevisions.map((revGroup, rIdx) => {
                            const isCurrent = `${revGroup.header.bom_id}_${revGroup.header.revision}` === `${selectedBomGroup.header.bom_id}_${selectedBomGroup.header.revision}`;
                            const isRevArchived = revGroup.header.status === 'ARCHIVED' || revGroup.header.status === 'SUPERSEDED';

                            return (
                              <div
                                key={rIdx}
                                onClick={() => setSelectedBomKey(`${revGroup.header.bom_id}_${revGroup.header.revision}`)}
                                className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                                  isCurrent
                                    ? 'border-blue-500 bg-blue-50/40 dark:bg-[#102237] shadow-sm ring-1 ring-blue-500/40'
                                    : 'border-slate-200 dark:border-[#1F3A5C]/60 hover:bg-slate-50 dark:hover:bg-[#102237]/40'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`p-1.5 rounded-lg ${isRevArchived ? 'bg-slate-500/10 text-slate-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {isRevArchived ? <Archive size={13} /> : <CheckCircle2 size={13} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                        Rev {revGroup.header.revision}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${getStatusBadge(revGroup.header.status)}`}>
                                        {revGroup.header.status}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      {revGroup.header.effective_from ? revGroup.header.effective_from.split('T')[0] : '2026-01-01'}
                                      {revGroup.header.effective_to ? ` to ${revGroup.header.effective_to.split('T')[0]}` : ' (Current Active)'}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {revGroup.components.length} comps
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-[#1F3A5C] rounded-xl h-full flex items-center justify-center">
                No BOM selected. Select an Engineering Bill of Materials from the left list.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REVISE RECIPE MODAL                                               */}
      {/* ========================================================================= */}
      {showReviseModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl my-auto animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-[#1F3A5C] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="text-blue-600 dark:text-blue-400" size={18} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Revise Master Recipe: {reviseCode} ({reviseName})
                </h3>
              </div>
              <button
                onClick={() => setShowReviseModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>
                <strong>GAMP 5 & IATF 16949 NOTICE:</strong> Upon e-signature authorization, active revision ({currentVersion}) will be automatically transitioned to <strong>ARCHIVED</strong> status. The new revision ({newVersion}) will become the sole <strong>ACTIVE</strong> recipe.
              </span>
            </div>

            <form onSubmit={triggerReviseRecipeSign} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Recipe Code</label>
                  <input
                    type="text"
                    disabled
                    value={reviseCode}
                    className="w-full bg-slate-100 dark:bg-[#102237]/60 border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-500 dark:text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Current Active Rev</label>
                  <input
                    type="text"
                    disabled
                    value={`Rev ${currentVersion}`}
                    className="w-full bg-slate-100 dark:bg-[#102237]/60 border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-500 dark:text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-blue-600 dark:text-blue-400 font-bold mb-1">New Revision *</label>
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value.toUpperCase())}
                    placeholder="e.g. B, C, 2.0"
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-blue-500/60 focus:border-blue-500 rounded-lg p-2 text-slate-900 dark:text-white font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Revision / ECO Justification *</label>
                <input
                  type="text"
                  required
                  value={reviseReason}
                  onChange={(e) => setReviseReason(e.target.value)}
                  placeholder="e.g. ECO-2026-004: Optimized CNC spindle speed and feed rate"
                  className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Master Formulation Scope</label>
                <textarea
                  rows={3}
                  value={reviseFormula}
                  onChange={(e) => setReviseFormula(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Planned Target Yield %</label>
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="100"
                  value={reviseYieldPct}
                  onChange={(e) => setReviseYieldPct(parseFloat(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Component lines overview */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Carried Components ({reviseBomItems.length})</label>
                <div className="border border-slate-200 dark:border-[#1F3A5C] rounded-lg overflow-hidden max-h-36 overflow-y-auto mes-scrollbar">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Name</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1F3A5C]/60">
                      {reviseBomItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#102237]/40">
                          <td className="p-2 font-mono text-blue-600 dark:text-blue-400">{item.component_code || item.material_code}</td>
                          <td className="p-2 text-slate-800 dark:text-slate-200">{item.component_name || resolveComponentName(item.component_code || item.material_code)}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-500">{item.quantity}</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">{item.uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1F3A5C]">
                <button
                  type="button"
                  onClick={() => setShowReviseModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-[#1F3A5C] text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#102237] cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded text-xs shadow-sm cursor-pointer flex items-center gap-1.5 transition"
                >
                  Proceed to E-Signature Authorization <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REVISE BOM MODAL                                                  */}
      {/* ========================================================================= */}
      {showReviseBomModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl my-auto animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-[#1F3A5C] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="text-blue-600 dark:text-blue-400" size={18} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Revise Engineering BOM: {reviseBomId}
                </h3>
              </div>
              <button
                onClick={() => setShowReviseBomModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>
                PARENT ASSEMBLY: <strong>{reviseBomParentMat}</strong> ({reviseBomParentName}) — PREVIOUS REVISION ({currentBomRev}) WILL BE ARCHIVED.
              </span>
            </div>

            <form onSubmit={triggerReviseBomSign} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">BOM ID</label>
                  <input
                    type="text"
                    disabled
                    value={reviseBomId}
                    className="w-full bg-slate-100 dark:bg-[#102237]/60 border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-500 dark:text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Current Active Rev</label>
                  <input
                    type="text"
                    disabled
                    value={`Rev ${currentBomRev}`}
                    className="w-full bg-slate-100 dark:bg-[#102237]/60 border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-500 dark:text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-blue-600 dark:text-blue-400 font-bold mb-1">New Revision *</label>
                  <input
                    type="text"
                    required
                    value={newBomRev}
                    onChange={(e) => setNewBomRev(e.target.value.toUpperCase())}
                    placeholder="e.g. B, C"
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-blue-500/60 focus:border-blue-500 rounded-lg p-2 text-slate-900 dark:text-white font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ECO Change Justification *</label>
                <input
                  type="text"
                  required
                  value={reviseBomReason}
                  onChange={(e) => setReviseBomReason(e.target.value)}
                  placeholder="e.g. ECO-2026-009: Supplier component batch adjustment"
                  className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Component Lines Editor */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Component Line Charges</label>
                <div className="border border-slate-200 dark:border-[#1F3A5C] rounded-lg overflow-hidden max-h-48 overflow-y-auto mes-scrollbar">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">Line</th>
                        <th className="p-2">Component</th>
                        <th className="p-2 text-right">Quantity</th>
                        <th className="p-2">UOM</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1F3A5C]/60">
                      {reviseBomComponents.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#102237]/40">
                          <td className="p-2 font-mono text-slate-500 dark:text-slate-400">#{c.line_no}</td>
                          <td className="p-2 font-mono text-blue-600 dark:text-blue-400">
                            {c.component_material} - {c.component_name || resolveComponentName(c.component_material)}
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.0001"
                              value={c.qty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...reviseBomComponents];
                                updated[i].qty = val;
                                setReviseBomComponents(updated);
                              }}
                              className="w-20 bg-white dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded p-1 text-right text-emerald-500 font-mono font-bold"
                            />
                          </td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">{c.uom}</td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReviseBomComponents(reviseBomComponents.filter((_, idx) => idx !== i));
                              }}
                              className="text-red-500 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Add Component to revision */}
              <div className="p-3 bg-slate-50 dark:bg-[#102237]/60 rounded-lg border border-slate-200 dark:border-[#1F3A5C] flex flex-wrap items-center gap-2">
                <select
                  value={modalCompCode}
                  onChange={(e) => {
                    setModalCompCode(e.target.value);
                    const found = materials.find(m => m.materialCode === e.target.value);
                    if (found) setModalCompUom(found.uom);
                  }}
                  className="bg-white dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.materialCode}>
                      {m.materialCode} - {m.materialName} ({m.uom})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={modalCompQty}
                  onChange={(e) => setModalCompQty(parseFloat(e.target.value))}
                  placeholder="Qty"
                  className="w-16 bg-white dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white text-right"
                />

                <button
                  type="button"
                  onClick={() => {
                    const lineNo = (reviseBomComponents.length + 1) * 10;
                    setReviseBomComponents([
                      ...reviseBomComponents,
                      {
                        line_no: lineNo,
                        component_material: modalCompCode,
                        component_name: resolveComponentName(modalCompCode),
                        component_type: modalCompType,
                        qty: modalCompQty,
                        uom: modalCompUom
                      }
                    ]);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  + Add Line
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1F3A5C]">
                <button
                  type="button"
                  onClick={() => setShowReviseBomModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-[#1F3A5C] text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#102237] cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded text-xs shadow-sm cursor-pointer flex items-center gap-1.5 transition"
                >
                  Proceed to E-Signature Authorization <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE NEW RECIPE MODAL                                          */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto mes-scrollbar space-y-4 shadow-2xl my-auto animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-[#1F3A5C] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="text-blue-600 dark:text-blue-400" size={18} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Create New Master Recipe & Formulation
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={triggerCreateRecipeSign} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Product / Part *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Recipe Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. RT-006"
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Recipe Title / Operation Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Precision CNC Grinding & Honing"
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Planned Yield %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="50"
                    max="100"
                    value={yieldPct}
                    onChange={(e) => setYieldPct(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Master Formulation Description</label>
                <textarea
                  rows={2}
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="Formulation specifications, heat parameters, spindle rates..."
                  className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Add BOM Component Row */}
              <div className="border-t border-slate-200 dark:border-[#1F3A5C] pt-3 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">BOM Components ({bomItems.length})</span>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={bomCode}
                    onChange={(e) => {
                      setBomCode(e.target.value);
                      const f = materials.find(m => m.materialCode === e.target.value);
                      if (f) setBomUom(f.uom);
                    }}
                    className="bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.materialCode}>
                        {m.materialCode} - {m.materialName} ({m.uom})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={bomQty}
                    onChange={(e) => setBomQty(parseFloat(e.target.value))}
                    placeholder="Qty"
                    className="w-20 bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white text-right font-mono"
                  />

                  <input
                    type="text"
                    value={bomPurpose}
                    onChange={(e) => setBomPurpose(e.target.value)}
                    placeholder="Purpose / Charge"
                    className="bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white flex-1"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const f = materials.find(m => m.materialCode === bomCode);
                      setBomItems([
                        ...bomItems,
                        {
                          component_code: bomCode,
                          component_name: f?.materialName || bomCode,
                          component_type: f?.materialType?.includes('RAW') ? 'RAW' : 'INTERMEDIATE',
                          quantity: bomQty,
                          uom: bomUom,
                          purpose: bomPurpose
                        }
                      ]);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    + Add Charge
                  </button>
                </div>

                {bomItems.length > 0 && (
                  <div className="border border-slate-200 dark:border-[#1F3A5C] rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-1.5">Code</th>
                          <th className="p-1.5">Component</th>
                          <th className="p-1.5 text-right">Quantity</th>
                          <th className="p-1.5">Purpose</th>
                          <th className="p-1.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#1F3A5C]/60">
                        {bomItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#102237]/40">
                            <td className="p-1.5 font-mono text-blue-600 dark:text-blue-400 font-bold">{item.component_code}</td>
                            <td className="p-1.5 text-slate-800 dark:text-slate-200">{item.component_name}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-emerald-500">{item.quantity} {item.uom}</td>
                            <td className="p-1.5 text-slate-500 dark:text-slate-400">{item.purpose}</td>
                            <td className="p-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => setBomItems(bomItems.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Process Steps */}
              <div className="border-t border-slate-200 dark:border-[#1F3A5C] pt-3 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Manufacturing Routing Steps ({steps.length})</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={stepName}
                    onChange={(e) => setStepName(e.target.value)}
                    placeholder="Op Name (e.g. Grinding)"
                    className="bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={stepCode}
                    onChange={(e) => setStepCode(e.target.value.toUpperCase())}
                    placeholder="Op Code (GRIND)"
                    className="bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={stepWc}
                    onChange={(e) => setStepWc(e.target.value.toUpperCase())}
                    placeholder="WC (WC-GRIND)"
                    className="bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={stepMachine}
                    onChange={(e) => setStepMachine(e.target.value.toUpperCase())}
                    placeholder="Machine (GRIND-01)"
                    className="bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={stepInst}
                    onChange={(e) => setStepInst(e.target.value)}
                    placeholder="Detailed SOP instructions..."
                    className="md:col-span-2 bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={stepCpp}
                    onChange={(e) => setStepCpp(e.target.value)}
                    placeholder="CPP (e.g. Ra: 0.4 um)"
                    className="bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      Step Type
                    </label>
                    <select
                      value={stepType}
                      onChange={(e) => setStepType(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="STANDARD">Standard SOP Operation</option>
                      <option value="QR_VERIFICATION">2D QR Code Verification (Poka-Yoke Gate)</option>
                      <option value="WEIGH_DISPENSE">Weigh & Dispense Verification</option>
                    </select>
                  </div>
                  {stepType === 'QR_VERIFICATION' && (
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">
                        Target Component SKU to Verify
                      </label>
                      <input
                        type="text"
                        value={stepTargetSku}
                        onChange={(e) => setStepTargetSku(e.target.value.toUpperCase())}
                        placeholder="e.g. RM-ST-001"
                        className="w-full bg-slate-50 dark:bg-[#102237] border border-emerald-500/50 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!stepName || !stepInst) return;
                    setSteps([
                      ...steps,
                      {
                        step: steps.length + 1,
                        operation_name: stepName,
                        operation_code: stepCode,
                        work_center: stepWc,
                        machine_code: stepMachine,
                        instruction: stepInst,
                        cpp: stepCpp,
                        step_type: stepType,
                        target_component_sku: stepTargetSku
                      }
                    ]);
                    setStepName('');
                    setStepInst('');
                    setStepCpp('');
                    setStepType('STANDARD');
                    setStepTargetSku('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  + Add Step
                </button>

                {steps.length > 0 && (
                  <div className="border border-slate-200 dark:border-[#1F3A5C] rounded-lg divide-y divide-slate-100 dark:divide-[#1F3A5C]/60 p-1 text-[11px] bg-slate-50/50 dark:bg-[#102237]/40">
                    {steps.map((s, idx) => (
                      <div key={idx} className="p-1.5 flex justify-between items-center text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-1.5">
                          <strong className="text-slate-900 dark:text-white">#{s.step} {s.operation_name}</strong> ({s.operation_code}) — {s.instruction}
                          {s.step_type === 'QR_VERIFICATION' && (
                            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/30">
                              QR: {s.target_component_sku || 'REQUIRED'}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1F3A5C]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-[#1F3A5C] text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#102237] cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded text-xs shadow-sm cursor-pointer flex items-center gap-1.5 transition"
                >
                  Proceed to E-Signature Authorization <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE NEW BOM MODAL                                             */}
      {/* ========================================================================= */}
      {showCreateBomModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto mes-scrollbar space-y-4 shadow-2xl my-auto animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-[#1F3A5C] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-blue-600 dark:text-blue-400" size={18} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Create New Engineering Bill of Materials (BOM)
                </h3>
              </div>
              <button
                onClick={() => setShowCreateBomModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={triggerCreateBomSign} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">BOM ID *</label>
                  <input
                    type="text"
                    required
                    value={newBomId}
                    onChange={(e) => setNewBomId(e.target.value.toUpperCase())}
                    placeholder="e.g. BOM-006"
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Parent Part Material *</label>
                  <select
                    value={newBomParentMat}
                    onChange={(e) => setNewBomParentMat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.materialCode}>
                        {m.materialCode} - {m.materialName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Initial Revision</label>
                  <input
                    type="text"
                    required
                    value={newBomRevision}
                    onChange={(e) => setNewBomRevision(e.target.value.toUpperCase())}
                    placeholder="A"
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Component Lines Editor */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Components List ({newBomComponents.length})</label>
                {newBomComponents.length > 0 && (
                  <div className="border border-slate-200 dark:border-[#1F3A5C] rounded-lg overflow-hidden mb-3">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2">Line</th>
                          <th className="p-2">Component Code</th>
                          <th className="p-2">Component Name</th>
                          <th className="p-2 text-right">Quantity</th>
                          <th className="p-2">UOM</th>
                          <th className="p-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#1F3A5C]/60">
                        {newBomComponents.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#102237]/40">
                            <td className="p-2 font-mono text-slate-500 dark:text-slate-400">#{c.line_no}</td>
                            <td className="p-2 font-mono text-blue-600 dark:text-blue-400 font-bold">{c.component_material}</td>
                            <td className="p-2 text-slate-800 dark:text-slate-200">{c.component_name}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-500">{c.qty}</td>
                            <td className="p-2 text-slate-500 dark:text-slate-400">{c.uom}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => setNewBomComponents(newBomComponents.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add component controls */}
                <div className="p-3 bg-slate-50 dark:bg-[#102237]/70 rounded-lg border border-slate-200 dark:border-[#1F3A5C] flex flex-wrap items-center gap-2">
                  <select
                    value={modalCompCode}
                    onChange={(e) => {
                      setModalCompCode(e.target.value);
                      const f = materials.find(m => m.materialCode === e.target.value);
                      if (f) {
                        setModalCompUom(f.uom);
                        setModalCompType(f.materialType?.includes('RAW') ? 'RAW' : 'INTERMEDIATE');
                      }
                    }}
                    className="bg-white dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.materialCode}>
                        {m.materialCode} - {m.materialName} ({m.uom})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={modalCompQty}
                    onChange={(e) => setModalCompQty(parseFloat(e.target.value))}
                    placeholder="Qty"
                    className="w-20 bg-white dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg p-1.5 text-xs text-slate-900 dark:text-white text-right font-mono focus:outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const lineNo = (newBomComponents.length + 1) * 10;
                      setNewBomComponents([
                        ...newBomComponents,
                        {
                          line_no: lineNo,
                          component_material: modalCompCode,
                          component_name: resolveComponentName(modalCompCode),
                          component_type: modalCompType,
                          qty: modalCompQty,
                          uom: modalCompUom
                        }
                      ]);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    + Add Component
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1F3A5C]">
                <button
                  type="button"
                  onClick={() => setShowCreateBomModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-[#1F3A5C] text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#102237] cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded text-xs shadow-sm cursor-pointer flex items-center gap-1.5 transition"
                >
                  Proceed to E-Signature Authorization <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 21 CFR PART 11 / IATF 16949 E-SIGNATURE MODAL                             */}
      {/* ========================================================================= */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1F3A5C] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Lock size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Regulatory E-Signature Verification
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-wider block">
                    FDA 21 CFR PART 11 & IATF 16949 AUDIT CHAIN
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSignature} className="space-y-4">
              {signError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-bounce">
                  <AlertTriangle size={14} />
                  {signError}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-[#102237] p-3.5 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 text-xs space-y-2">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Regulatory Scope & Intent</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 leading-relaxed text-xs">
                    {signMeaning}
                  </p>
                </div>
              </div>

              {/* Signatory User Input Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck size={14} className="text-blue-600 dark:text-blue-400" />
                    Signatory User / ID
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">21 CFR §11.200 Identity</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={signUsername}
                    onChange={(e) => setSignUsername(e.target.value)}
                    placeholder="Enter signatory username (e.g. admin)"
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg px-3 py-2.5 text-sm dark:text-white text-slate-800 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              {/* Password Input Field with Show/Hide Toggle */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock size={14} className="text-blue-600 dark:text-blue-400" />
                    Password Authorization
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Hint: SecretMESPassword123
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showSignPassword ? 'text' : 'password'}
                    required
                    value={signPassword}
                    onChange={(e) => setSignPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 dark:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg pl-3 pr-10 py-2.5 text-sm dark:text-white text-slate-800 focus:outline-none focus:border-blue-500 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignPassword(!showSignPassword)}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer focus:outline-none"
                    title={showSignPassword ? "Hide password" : "Show password"}
                  >
                    {showSignPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1F3A5C]">
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-[#1F3A5C] text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#102237] cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSigning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  {isSigning ? 'Signing & Releasing...' : 'Confirm Digital Signature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIGH-RES IMAGE & 3D STL ZOOM MODAL                                        */}
      {/* ========================================================================= */}
      {zoomedFile && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fadeIn"
          onClick={() => setZoomedFile(null)}
        >
          <div
            className="bg-[#142A45] border border-[#1F3A5C] rounded-2xl p-4 max-w-2xl w-full shadow-2xl relative flex flex-col items-center justify-center gap-3 text-white my-auto animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center w-full border-b border-[#1F3A5C] pb-2.5">
              <h4 className="text-sm font-bold tracking-wide text-slate-200 flex items-center gap-2">
                <Box size={16} className="text-[#F5A623]" />
                {zoomedTitle}
              </h4>
              <button
                onClick={() => setZoomedFile(null)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="w-full flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-hidden bg-[#102237] rounded-xl p-2 border border-[#1F3A5C]">
              {zoomedFile.toLowerCase().endsWith('.stl') ? (
                <StlViewer url={zoomedFile.startsWith('http') ? zoomedFile : getApiUrl(zoomedFile)} />
              ) : (
                <img
                  src={zoomedFile.startsWith('http') ? zoomedFile : getApiUrl(zoomedFile)}
                  alt="Enlarged Material Preview"
                  className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg"
                />
              )}
            </div>

            <div className="flex justify-between items-center w-full pt-1 text-[11px] text-slate-400">
              <span className="font-mono">{zoomedFile}</span>
              <button
                onClick={() => setZoomedFile(null)}
                className="px-3 py-1 bg-[#102237] hover:bg-[#142A45] text-slate-200 rounded text-xs transition cursor-pointer border border-[#1F3A5C]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
