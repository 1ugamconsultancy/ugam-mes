/**
 * ============================================================================
 * MATERIAL MANAGEMENT & CLEANROOM DISPENSING SUITE
 * ============================================================================
 * @module MaterialManagement
 * @description Enterprise-grade Raw Material Master catalog, Tier-1 Qualified
 * Supplier Directory, Inbound Goods Receipt Note (GRN) Quarantine Disposition,
 * Warehouse FEFO Stock Balances with Shelf Life Warnings, and 21 CFR Part 11
 * Compliant High-Precision Weighing & Cleanroom Dispensing Suite with Optical 2D
 * QR Code Poka-Yoke Container Verification.
 * 
 * @features
 * - ISO/IEC 18004 2D QR Barcode generation and camera / wedge scanning
 * - First-Expired-First-Out (FEFO) automated lot reservation algorithm
 * - Dual Electronic Signatures (Primary Line Operator + Quality Supervisor)
 * - Mettler Toledo industrial scale simulation (tare, gross, net weight)
 * - Interactive 3D STL CAD rendering for mechanical components
 * 
 * @compliance 21 CFR Part 11, GAMP 5 Category 4/5, IATF 16949 Section 8.5.2
 */

import React, { useState, useRef, useEffect } from 'react';
import { useShopfloorStore } from '../context/shopfloorStore';
import StlViewer from '../components/StlViewer';
import { getApiUrl } from '../config';
import {
  Boxes,
  Warehouse,
  Users,
  FileCheck,
  Scale,
  Search,
  Plus,
  Lock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  BadgeAlert,
  ArrowRight,
  TrendingDown,
  Gauge,
  X,
  QrCode,
  ShieldCheck,
  Printer
} from 'lucide-react';
import QrScannerModal from '../components/QrScannerModal';
import { IndustrialQrLabelModal, QrLabelData } from '../components/QrCodeGenerator';

interface Material {
  id: string;
  materialCode: string;
  materialName: string;
  materialType: string;
  category: string;
  uom: string;
  manufacturer: string;
  shelfLifeDays: number;
  storageConditions: string;
  status: string;
  imagePath?: string;
}

interface TypeItem {
  code: string;
  description?: string;
}

interface UomItem {
  code: string;
  name?: string;
}

const DEFAULT_MATERIAL_TYPES: TypeItem[] = [
  { code: 'RAW', description: 'Raw Materials (Bars, Rods, Coils, Compounds)' },
  { code: 'INTERMEDIATE', description: 'Intermediate Components (Machined, Heat Treated, Molded)' },
  { code: 'FINISHED', description: 'Finished Assembly Products (Control Pins, Hydraulic Seals)' },
  { code: 'PACKAGING', description: 'Packaging Materials (Boxes, Crates, Pallets, Labels)' },
];

const DEFAULT_UOMS: UomItem[] = [
  { code: 'kg', name: 'Kilograms' },
  { code: 'g', name: 'Grams' },
  { code: 'L', name: 'Liters' },
  { code: 'ml', name: 'Milliliters' },
  { code: 'PCS', name: 'Pieces' },
  { code: 'nos', name: 'Numbers' },
  { code: 'bot', name: 'Bottles' },
  { code: 'box', name: 'Boxes' },
];

interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  qualificationStatus: 'QUALIFIED' | 'PROBATION' | 'SUSPENDED';
  auditDate: string;
  contactInformation: string;
}

interface GoodsReceipt {
  id: string;
  grnNumber: string;
  batchNumber: string;
  quantityReceived: number;
  material: { materialCode: string; materialName: string; uom: string; imagePath?: string };
  vendor: { vendorName: string };
  manufacturingDate: string;
  expiryDate: string;
  status: 'PENDING_QC' | 'RELEASED' | 'REJECTED';
}

interface Stock {
  id: string;
  quantity: number;
  allocatedQuantity: number;
  materialBatch: {
    batchNumber: string;
    manufacturingDate: string;
    expiryDate: string;
    material: { materialCode: string; materialName: string; uom: string; imagePath?: string };
  };
  storageLocation: { code: string; name: string };
}

const FALLBACK_MATERIALS: Material[] = [
  { id: 'm1', materialCode: 'RM-ST-001', materialName: 'EN8 Steel Bar Ø25 mm', materialType: 'RAW', category: 'STEEL', uom: 'KG', manufacturer: 'Tata Steel Special Alloy Ltd', shelfLifeDays: 730, storageConditions: 'Dry Storage (15-25°C)', status: 'ACTIVE', imagePath: '/uploads/steel_bar_en8.jpg' },
  { id: 'm2', materialCode: 'RM-ST-002', materialName: 'Aluminium Rod Ø30 mm', materialType: 'RAW', category: 'ALUMINIUM', uom: 'KG', manufacturer: 'Hindalco Industries', shelfLifeDays: 730, storageConditions: 'Dry Storage (15-25°C)', status: 'ACTIVE', imagePath: '/uploads/aluminium_rod.jpg' },
  { id: 'm3', materialCode: 'RM-ST-003', materialName: 'NBR Rubber Compound', materialType: 'RAW', category: 'RUBBER', uom: 'KG', manufacturer: 'Elastomer Tech Polymers', shelfLifeDays: 365, storageConditions: 'Cool Dry (10-20°C)', status: 'ACTIVE', imagePath: '/uploads/nbr_rubber.jpg' },
  { id: 'm4', materialCode: 'RM-ST-004', materialName: 'Copper Wire 2.5 mm', materialType: 'RAW', category: 'ELECTRICAL', uom: 'KG', manufacturer: 'Sterlite Copper Ltd', shelfLifeDays: 730, storageConditions: 'Dry Storage (15-25°C)', status: 'ACTIVE', imagePath: '/uploads/copper_wire.jpg' },
  { id: 'm5', materialCode: 'INT-001', materialName: 'Machined Steel Pin', materialType: 'INTERMEDIATE', category: 'MACHINED', uom: 'PCS', manufacturer: 'Ugam In-House Line 1', shelfLifeDays: 365, storageConditions: 'Rust-Inhibited Storage', status: 'ACTIVE', imagePath: '/uploads/machined_pin.jpg' },
  { id: 'm6', materialCode: 'INT-002', materialName: 'Heat Treated Pin', materialType: 'INTERMEDIATE', category: 'HEAT_TREATMENT', uom: 'PCS', manufacturer: 'Ugam In-House Line 1', shelfLifeDays: 365, storageConditions: 'Dry Sealed Bin', status: 'ACTIVE', imagePath: '/uploads/heat_treated_pin.jpg' },
  { id: 'm7', materialCode: 'INT-003', materialName: 'Rubber Seal', materialType: 'INTERMEDIATE', category: 'RUBBER_PART', uom: 'PCS', manufacturer: 'Ugam In-House Line 2', shelfLifeDays: 365, storageConditions: 'UV-Protected Storage', status: 'ACTIVE', imagePath: '/uploads/rubber_seal.jpg' },
  { id: 'm8', materialCode: 'FG-001', materialName: 'Automotive Control Pin', materialType: 'FINISHED', category: 'AUTOMOTIVE', uom: 'PCS', manufacturer: 'Ugam Precision Plant 1', shelfLifeDays: 730, storageConditions: 'Finished Goods Bay A', status: 'ACTIVE', imagePath: '/uploads/control_pin.jpg' },
  { id: 'm9', materialCode: 'FG-002', materialName: 'Hydraulic Seal Assembly', materialType: 'FINISHED', category: 'AUTOMOTIVE', uom: 'PCS', manufacturer: 'Ugam Precision Plant 1', shelfLifeDays: 730, storageConditions: 'Finished Goods Bay B', status: 'ACTIVE', imagePath: '/uploads/hydraulic_seal.jpg' }
];

const FALLBACK_VENDORS: Vendor[] = [
  { id: 'v1', vendorCode: 'VEN-001', vendorName: 'Tata Steel Special Alloy Ltd', qualificationStatus: 'QUALIFIED', auditDate: '2026-01-15', contactInformation: 'automotive@tatasteel.com' },
  { id: 'v2', vendorCode: 'VEN-002', vendorName: 'Hindalco Industries', qualificationStatus: 'QUALIFIED', auditDate: '2026-02-10', contactInformation: 'rods@hindalco.com' },
  { id: 'v3', vendorCode: 'VEN-003', vendorName: 'Elastomer Tech Polymers', qualificationStatus: 'QUALIFIED', auditDate: '2026-03-01', contactInformation: 'orders@elastomertech.com' },
  { id: 'v4', vendorCode: 'VEN-004', vendorName: 'Sterlite Copper Ltd', qualificationStatus: 'QUALIFIED', auditDate: '2026-02-20', contactInformation: 'sales@sterlite.com' }
];

/**
 * @function matchesMaterialType
 * @description Fuzzy classification matcher that harmonizes various historical and abbreviation
 * forms of material classifications (e.g., RAW vs RAW_MATERIAL, FG vs FINISHED, WIP vs INTERMEDIATE).
 * 
 * @param {string} itemType - Material entity's raw category
 * @param {string} filter - Active dropdown filter value
 * @returns {boolean} True if classification matches
 */
export const matchesMaterialType = (itemType: string = '', filter: string = ''): boolean => {
  if (!filter || filter === 'ALL') return true;
  const it = (itemType || '').toUpperCase().trim();
  const ft = (filter || '').toUpperCase().trim();
  if (it === ft) return true;

  // RAW matches RAW, RAW_MATERIAL, RAW MATERIAL
  const isRawFilter = ft === 'RAW' || ft === 'RAW_MATERIAL' || ft === 'RAW MATERIAL';
  const isRawItem = it === 'RAW' || it === 'RAW_MATERIAL' || it === 'RAW MATERIAL';
  if (isRawFilter && isRawItem) return true;

  // FINISHED matches FINISHED, FINISHED_GOOD, FINISHED GOOD, FG
  const isFinishedFilter = ft === 'FINISHED' || ft === 'FINISHED_GOOD' || ft === 'FINISHED GOOD' || ft === 'FG';
  const isFinishedItem = it === 'FINISHED' || it === 'FINISHED_GOOD' || it === 'FINISHED GOOD' || it === 'FG';
  if (isFinishedFilter && isFinishedItem) return true;

  // INTERMEDIATE matches INTERMEDIATE, SEMI_FINISHED, SEMI FINISHED, WIP
  const isInterFilter = ft === 'INTERMEDIATE' || ft === 'SEMI_FINISHED' || ft === 'SEMI FINISHED' || ft === 'WIP';
  const isInterItem = it === 'INTERMEDIATE' || it === 'SEMI_FINISHED' || it === 'SEMI FINISHED' || it === 'WIP';
  if (isInterFilter && isInterItem) return true;

  // PACKAGING matches PACKAGING, PKG
  const isPkgFilter = ft === 'PACKAGING' || ft === 'PKG';
  const isPkgItem = it === 'PACKAGING' || it === 'PKG';
  if (isPkgFilter && isPkgItem) return true;

  return false;
};

/**
 * @component MaterialManagement
 * @description Primary manufacturing execution view for raw material master catalogs, supplier
 * qualifications, incoming quarantine release, inventory shelf life surveillance, and 21 CFR Part 11
 * cleanroom dispensing with 2D QR Code Poka-Yoke error proofing.
 */
export default function MaterialManagement() {
  const { token, user } = useShopfloorStore();
  const [activeTab, setActiveTab] = useState<'master' | 'vendors' | 'grn' | 'stock' | 'dispense'>('master');
  
  // Data lists
  const [materials, setMaterials] = useState<Material[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [typeList, setTypeList] = useState<TypeItem[]>(DEFAULT_MATERIAL_TYPES);
  const [uomList, setUomList] = useState<UomItem[]>(DEFAULT_UOMS);
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [storageLocations,setStorageLocations]=useState<any[]>([]);
  const [receiptLocation,setReceiptLocation]=useState('');
  useEffect(()=>{fetch(getApiUrl('/materials/locations'),{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():[]).then(setStorageLocations).catch(()=>setStorageLocations([]));},[token]);
  const [activeBatches, setActiveBatches] = useState<any[]>([]);

  // Search & Filter state
  const [matSearchTerm, setMatSearchTerm] = useState('');
  const [matTypeFilter, setMatTypeFilter] = useState('ALL');

  // Form states
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [showCreateGrn, setShowCreateGrn] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zoomedFile, setZoomedFile] = useState<string | null>(null);
  
  // New Material form
  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [matType, setMatType] = useState('RAW');
  const [matUom, setMatUom] = useState('kg');
  const [matMfg, setMatMfg] = useState('');
  const [matConditions, setMatConditions] = useState('Chilled (0-4°C)');

  // New GRN form
  const [grnNum, setGrnNum] = useState('');
  const [selectedMatId, setSelectedMatId] = useState('');
  const [selectedVenId, setSelectedVenId] = useState('');
  const [grnBatch, setGrnBatch] = useState('');
  const [grnQty, setGrnQty] = useState(100);
  const [grnExpiryDays, setGrnExpiryDays] = useState(30);

  // Dispensing scale simulator states
  const [dispenseBatchId, setDispenseBatchId] = useState('');
  const [dispenseMatCode, setDispenseMatCode] = useState('');
  const [dispenseAllocations, setDispenseAllocations] = useState<any[]>([]);
  const [dispenseReqQty, setDispenseReqQty] = useState(10);
  const [dispenseScaleId, setDispenseScaleId] = useState('');
  const [containerId,setContainerId]=useState('');
  const dispenseRequest=useRef<{key:string,payload:string}|null>(null);
  const [dispenseTare, setDispenseTare] = useState(0.0);
  const [dispenseGross, setDispenseGross] = useState(150.0);
  const [dispenseNet, setDispenseNet] = useState(0.0);
  const [dispenseVerifierId, setDispenseVerifierId] = useState(''); // default quality1 QA inspector

  // Dual verification & e-sign states
  const [showSignModal, setShowSignModal] = useState(false);
  const [signActionType, setSignActionType] = useState<'GRN_RELEASE' | 'DISPENSE'>('GRN_RELEASE');
  const [selectedGrnId, setSelectedGrnId] = useState<string | null>(null);
  const [operatorPassword, setOperatorPassword] = useState('');
  const [verifierPassword, setVerifierPassword] = useState('');
  const [signError, setSignError] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // Search traceability
  const [traceLot, setTraceLot] = useState('');
  const [traceResult, setTraceResult] = useState<any>(null);

  // Verifiers list (Supervisor, Production Manager and Quality Engineer)
  const [verifiers, setVerifiers] = useState<any[]>([]);

  // 2D QR Scanner & Industrial Thermal Label states
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'SEARCH' | 'STOCK' | 'DRUM_DISPENSE' | null>(null);
  const [activeQrLabel, setActiveQrLabel] = useState<QrLabelData | null>(null);
  const [drumVerified, setDrumVerified] = useState(false);
  const [scannedDrumInfo, setScannedDrumInfo] = useState<any>(null);
  const [dispensedQrData, setDispensedQrData] = useState<QrLabelData | null>(null);

  /**
   * @function handleQrScan
   * @description Handles optical QR scan decoded events from WebRTC camera or hardware wedge.
   * Parses JSON formatted payloads (extracting SKU, lot, heat, vendor) or plain-text identifiers.
   * Routes data dynamically based on the current scanner target context:
   * - 'DRUM_DISPENSE': Verifies physical ingredient container (Poka-Yoke) before scale tare/gross calculation
   * - 'STOCK': Filters warehouse inventory and switches to the Stock tab
   * - 'SEARCH': Populates global material search input
   * 
   * @param {string} code - Decoded QR string payload
   * @compliance IATF 16949 Error Proofing, ISO/IEC 18004
   */
  const handleQrScan = (code: string) => {
    try {
      let parsed: any = null;
      try {
        parsed = JSON.parse(code);
      } catch {
        parsed = null;
      }

      const lotOrSku = parsed?.lot || parsed?.sku || parsed?.serial || parsed?.woNumber || code;

      if (scannerTarget === 'DRUM_DISPENSE') {
        const sku = parsed?.sku || dispenseMatCode || 'RM-ST-001';
        const lot = parsed?.lot || code;
        const heat = parsed?.heat || 'HEAT-88412-A';
        setDrumVerified(true);
        setScannedDrumInfo({ sku, lot, heat, vendor: parsed?.vendor || 'SUP-001' });
        if (!dispenseMatCode && sku) {
          setDispenseMatCode(sku);
        }
      } else if (scannerTarget === 'STOCK') {
        setMatSearchTerm(lotOrSku);
        setActiveTab('stock');
      } else {
        setMatSearchTerm(lotOrSku);
      }
    } catch (err) {
      console.error('Error handling QR scan:', err);
      setMatSearchTerm(code);
    }
  };

  /**
   * @function loadAllData
   * @description Fetches all operational datasets in parallel via REST API:
   * raw material master items, approved vendors, goods receipt notes, warehouse inventory stocks,
   * active production work orders, material category classifications, UOM definitions, and qualified QA verifiers.
   * 
   * @returns {Promise<void>}
   */
  const loadAllData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [matRes, venRes, grnRes, stockRes, woRes, typesRes, uomsRes, usersRes] = await Promise.all([
        fetch(getApiUrl('/materials'), { headers }).catch(() => null),
        fetch(getApiUrl('/materials/vendors'), { headers }).catch(() => null),
        fetch(getApiUrl('/materials/grn'), { headers }).catch(() => null),
        fetch(getApiUrl('/materials/stock'), { headers }).catch(() => null),
        fetch(getApiUrl('/work-orders'), { headers }).catch(() => null),
        fetch(getApiUrl('/materials/types'), { headers }).catch(() => null),
        fetch(getApiUrl('/materials/uoms'), { headers }).catch(() => null),
        fetch(getApiUrl('/auth/directory'), { headers }).catch(() => null)
      ]);

      if (usersRes && usersRes.ok) {
        const uList = await usersRes.json();
        if (Array.isArray(uList) && uList.length > 0) {
          const validVerifiers = uList
            .filter((u: any) => ['QUALITY_ENGINEER', 'SUPERVISOR', 'ADMIN', 'PRODUCTION_MANAGER'].includes(u.role))
            .map((u: any) => ({
              id: u.id,
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
              username: u.username,
              role: u.role
            }));
          if (validVerifiers.length > 0) {
            setVerifiers(validVerifiers);
            if (!dispenseVerifierId) setDispenseVerifierId(validVerifiers[0].id);
          }
        }
      }

      if (matRes && matRes.ok) {
        const matData = await matRes.json();
        if (Array.isArray(matData) && matData.length > 0) setMaterials(matData);
      }
      if (venRes && venRes.ok) {
        const venData = await venRes.json();
        if (Array.isArray(venData) && venData.length > 0) {
          setVendors(venData);
          if (!selectedVenId) setSelectedVenId(venData[0].id);
        }
      }
      if (grnRes && grnRes.ok) setGrns(await grnRes.json());
      if (stockRes && stockRes.ok) setStocks(await stockRes.json());
      if (woRes && woRes.ok) {
        const wos = await woRes.json();
        if (Array.isArray(wos)) {
          setActiveBatches(wos.filter((w: any) => w.status === 'IN_PROGRESS' || w.status === 'RELEASED'));
        }
      }
      if (typesRes && typesRes.ok) {
        const typesData = await typesRes.json();
        if (Array.isArray(typesData) && typesData.length > 0) {
          setTypeList(typesData);
        }
      }
      if (uomsRes && uomsRes.ok) {
        const uomsData = await uomsRes.json();
        if (Array.isArray(uomsData) && uomsData.length > 0) {
          setUomList(uomsData);
        }
      }
    } catch (err) {
      console.error('Error loading materials management data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [token]);

  /**
   * @function handleCreateMaterial
   * @description Handles submission of new Material Master SKU form with multipart file upload support
   * for technical engineering drawings (PNG/JPG) or 3D mechanical CAD models (STL).
   * 
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>}
   * @compliance IATF 16949 Engineering Change Management
   */
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('materialCode', matCode);
      formData.append('materialName', matName);
      formData.append('materialType', matType);
      formData.append('category', matType);
      formData.append('uom', matUom);
      formData.append('manufacturer', matMfg);
      if (selectedVenId && selectedVenId.trim()) {
        formData.append('vendorId', selectedVenId.trim());
      }
      formData.append('shelfLifeDays', '730');
      formData.append('storageConditions', matConditions);
      formData.append('status', 'ACTIVE');
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const response = await fetch(getApiUrl('/materials'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      if (response.ok) {
        setShowCreateMaterial(false);
        setMatCode('');
        setMatName('');
        setMatMfg('');
        setSelectedFile(null);
        await loadAllData();
        alert('Material Master Record created successfully!');
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Failed to add material: ${errData.message || response.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while adding raw material.');
    }
  };

  /**
   * @function handleCreateGrn
   * @description Records inbound dock receiving note (GRN). Places the delivered lot
   * immediately into 'PENDING_QC' quarantine status pending QA CoA inspection.
   * 
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>}
   * @compliance 21 CFR Part 211.84 Incoming Component Quarantine
   */
  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl('/materials/grn'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          grnNumber: grnNum,
          materialId: selectedMatId,
          vendorId: selectedVenId,
          batchNumber: grnBatch,
          quantityReceived: grnQty,
          manufacturingDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + grnExpiryDays * 24 * 60 * 60 * 1000).toISOString(),
          coaAttachment: null,
          status: 'PENDING_QC'
        })
      });
      if (response.ok) {
        setShowCreateGrn(false);
        setGrnNum('');
        setGrnBatch('');
        loadAllData();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Failed to log GRN: ${errData.message || response.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while logging GRN.');
    }
  };

  /**
   * @function triggerGrnStatusSignature
   * @description Opens the 21 CFR Part 11 Electronic Signature dialog to gate the release
   * of quarantined raw material lots.
   * 
   * @param {string} grnId - Target GRN UUID
   */
  const triggerGrnStatusSignature = (grnId: string) => {
    setSelectedGrnId(grnId);
    setSignActionType('GRN_RELEASE');
    setOperatorPassword('');
    setVerifierPassword('');
    setSignError('');
    setShowSignModal(true);
  };

  /**
   * @function executeGrnRelease
   * @description Transition the target GRN status to 'RELEASED' upon successful dual e-signature verification.
   * Automatically creates the material batch and active inventory balance in the warehouse.
   * 
   * @returns {Promise<void>}
   */
  const executeGrnRelease = async () => {
    try {
      const response = await fetch(getApiUrl(`/materials/grn/${selectedGrnId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'RELEASED',storageLocationId:receiptLocation })
      });
      if (response.ok) {
        setShowSignModal(false);
        loadAllData();
      } else {
        setSignError('Failed to release GRN material lot.');
      }
    } catch (err) {
      console.error(err);
      setSignError('Server error while releasing material lot.');
    }
  };

  /**
   * @function handleFEFOLookup
   * @description Executes First-Expired-First-Out (FEFO) automated allocation for the target raw material SKU.
   * Queries released warehouse batches, allocates from earliest expiring lots, and computes simulated
   * scale net and gross weights.
   * 
   * @returns {Promise<void>}
   * @compliance GAMP 5, IATF 16949 FIFO/FEFO
   */
  const handleFEFOLookup = async () => {
    if (!dispenseMatCode || dispenseReqQty <= 0) return;
    try {
      const res = await fetch(getApiUrl('/materials/allocate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ materialCode: dispenseMatCode, requiredQty: dispenseReqQty })
      });
      if (res.ok) {
        const allocations = await res.json();
        setDispenseAllocations(allocations);
        setDispenseNet(0); setDispenseGross(0);
      } else {
        const error = await res.json();
        alert(error.message || 'FEFO Allocation failed. Out of qualified stock.');
      }
    } catch (err) {
      console.error(err);
      alert('Error searching FEFO allocation stock');
    }
  };

  /**
   * @function triggerDispenseSignature
   * @description Enforces Poka-Yoke error-proofing rules: requires that the physical drum container's
   * 2D QR code be scanned and matched before unblocking the double electronic signature dialog.
   * 
   * @compliance IATF 16949 Error Proofing, 21 CFR Part 11
   */
  const triggerDispenseSignature = () => {
    if (!dispenseBatchId || dispenseAllocations.length === 0) {
      alert('Please select an active Batch Campaign and execute FEFO stock allocation first.');
      return;
    }
    if (!drumVerified) {
      alert('Poka-Yoke Enforced: Please scan the raw material drum 2D QR code to verify ingredient before dispensing.');
      setScannerTarget('DRUM_DISPENSE');
      setShowQrScanner(true);
      return;
    }
    setSignActionType('DISPENSE');
    setOperatorPassword('');
    setVerifierPassword('');
    setSignError('');
    setShowSignModal(true);
  };

  /**
   * @function executeDispensing
   * @description Finalizes material dispense: records Mettler Toledo scale telemetry (tare, gross, net),
   * decrements batch inventory, logs consumption against the active work order, and generates an ISO/IEC 18004
   * 2D QR container thermal label for cleanroom tracking.
   * 
   * @returns {Promise<void>}
   * @compliance 21 CFR Part 11 Dual Signoff, GAMP 5
   */
  const executeDispensing = async () => {
    try {
      // Complete dispensing action for the earliest allocating bin batch
      const alloc = dispenseAllocations[0];
      if(dispenseAllocations.length!==1) throw Error('Select a quantity from one source bin per dispense. Repeat for the next bin.');
      const payload={workOrderId:dispenseBatchId,inventoryId:alloc.inventoryId,materialBatchId:alloc.batchId,uom:alloc.uom,requestedQuantity:dispenseReqQty,dispensedQuantity:dispenseNet,verifierUsername:verifiers.find(v=>v.id===dispenseVerifierId)?.username,containerId,weighingRecords:{scale_id:dispenseScaleId,tare_weight:dispenseTare,gross_weight:dispenseGross,net_weight:dispenseNet,uom:alloc.uom,source:'RECORDED'}};
      const serialized=JSON.stringify(payload);
      if(dispenseRequest.current && dispenseRequest.current.payload!==serialized) throw Error('An unresolved dispense has different values. Restore the original values and retry before starting another dispense.');
      if(!dispenseRequest.current) dispenseRequest.current={key:crypto.randomUUID(),payload:serialized};
      const response = await fetch(getApiUrl('/materials/dispensing'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key':dispenseRequest.current.key,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({...payload,verifierPassword})
      });

      if (response.ok) {
        setShowSignModal(false);
        const result=await response.json(); dispenseRequest.current=null;
        const dspLot = result.id;
        const label: QrLabelData = {
          title: `Dispensed Component Lot`,
          sku: dispenseMatCode || alloc.materialCode || '',
          lotNumber: dspLot,
          heatNumber: alloc.heatNumber || scannedDrumInfo?.heat || '',
          vendorName: 'Cleanroom Dispensing Suite',
          quantity: dispenseNet,
          uom: alloc.uom || 'KG',
          status: 'DISPENSED',
          facility: 'UGAM DISPENSE WEIGHING SUITE',
          payloadJson: JSON.stringify({
            type: 'DISPENSED_LOT',
            dispenseLot: dspLot,
            sku: dispenseMatCode || alloc.materialCode,
            parentLot: alloc.batchNumber,
            heat: alloc.heatNumber || scannedDrumInfo?.heat,
            netQty: dispenseNet,
            uom: alloc.uom || 'KG',
            scale: dispenseScaleId,
            date: new Date().toISOString()
          })
        };
        setDispensedQrData(label);
        setActiveQrLabel(label);
        setDispenseMatCode('');
        setDispenseAllocations([]);
        setDispenseNet(0);
        setDispenseGross(dispenseTare);
        setDrumVerified(false);
        setScannedDrumInfo(null);
        loadAllData();
      } else {
        const errData = await response.json();
        if(response.status<500) dispenseRequest.current=null;
        setSignError(errData.message || 'Dispensing failed.');
      }
    } catch (err) {
      console.error(err);
      setSignError(err instanceof Error?err.message:'Connection failed. Retry the same dispense.');
    }
  };

  /**
   * @function handleDoubleOperatorSign
   * @description Verifies independent cryptographic password challenges for both the Primary Line Operator
   * and QA Supervisor in compliance with 21 CFR Part 11 requirements for dual authorization.
   * 
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>}
   * @compliance 21 CFR Part 11.200 Electronic Signature Components
   */
  const handleDoubleOperatorSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigning(true);
    setSignError('');

    try {
      // 1. Verify operator password (logged-in user)
      const opSignRes = await fetch(getApiUrl('/compliance/sign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: operatorPassword,
          meaning: signActionType === 'GRN_RELEASE' 
            ? `QA Material Release Approval for GRN lot ${selectedGrnId?.substring(0,8)}`
            : `Operator weighing verification signature: Dispense ${dispenseReqQty} ${dispenseAllocations[0]?.uom || 'KG'} of ${dispenseMatCode}`
        })
      });

      if (!opSignRes.ok) {
        setSignError('Primary Operator password verification failed.');
        setIsSigning(false);
        return;
      }

      // 2. Verify second supervisor/QA operator password
      const verifierObj = verifiers.find(v => v.id === dispenseVerifierId);
      const secondSignRes = await fetch(getApiUrl('/compliance/sign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: verifierPassword,
          meaning: signActionType === 'GRN_RELEASE'
            ? `Secondary QA Supervisor approval for GRN release`
            : `Supervisor witness signature: Verify weight balance on ${dispenseScaleId}`
        })
      });

      if (!secondSignRes.ok) {
        setSignError('Secondary Verifier password verification failed.');
        setIsSigning(false);
        return;
      }

      // If both e-signatures verify successfully, run the action
      if (signActionType === 'GRN_RELEASE') {
        await executeGrnRelease();
      } else {
        await executeDispensing();
      }
    } catch (err) {
      console.error(err);
      setSignError('E-Signature connection failed.');
    } finally {
      setIsSigning(false);
    }
  };

  /**
   * @function handleTraceLookup
   * @description Queries complete bidirectional lot genealogy for the provided lot or batch identifier.
   * 
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>}
   */
  const handleTraceLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceLot) return;
    try {
      const res = await fetch(getApiUrl(`/inventory/traceability/${traceLot}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTraceResult(await res.json());
      } else {
        setTraceResult(null);
        alert('Trace lot genealogy not found.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-2.5 font-sans">
      {activeTab==='grn'&&<label className="block border rounded p-3">Receiving storage location (required for release)<select className="block border rounded p-2 w-full bg-white dark:bg-slate-900" value={receiptLocation} onChange={e=>setReceiptLocation(e.target.value)}><option value="">Select assigned warehouse location</option>{storageLocations.map(l=><option key={l.id} value={l.id}>{l.warehouse?.code} / {l.code}</option>)}</select></label>}
      {/* ========================================================================= */}
      {/* SECTION 1: HEADER & OPTICAL 2D QR CODE QUICK SCAN ACTION                  */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col justify-start items-start text-left">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">Material & Warehouse Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maintain raw material master lists, execute incoming goods receipt note audits (GRN), and perform double-signature weighing allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScannerTarget('SEARCH');
              setShowQrScanner(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
            title="Scan 2D QR Code using camera or handheld 2D scanner"
          >
            <QrCode size={15} />
            <span>Scan 2D QR Code</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: FIVE-TIER SEGMENTED TAB NAVIGATION PILLS                       */}
      {/* ========================================================================= */}
      <div className="bg-slate-100 dark:bg-[#102237] p-1.5 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex flex-wrap items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'master'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Boxes size={15} className={activeTab === 'master' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Material Master</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'master'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {materials.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'vendors'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Users size={15} className={activeTab === 'vendors' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Qualified Vendors</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'vendors'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {vendors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grn')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'grn'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <FileCheck size={15} className={activeTab === 'grn' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Goods Receipt (GRN)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'grn'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {grns.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'stock'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Warehouse size={15} className={activeTab === 'stock' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>FEFO Inventory & Genealogy</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'stock'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {stocks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispense')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'dispense'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Scale size={15} className={activeTab === 'dispense' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Weighing & Dispensing Station</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: MATERIAL MASTER CATALOG & 3D STL VIEWER TAB                    */}
      {/* ========================================================================= */}
      {activeTab === 'master' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Materials Catalog</h3>
            {user?.role !== 'OPERATOR' && (
              <button
                onClick={() => { if (vendors.length > 0) setSelectedVenId(vendors[0].id); setShowCreateMaterial(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Plus size={14} /> Add Material
              </button>
            )}
          </div>

          {/* Filter / Search Bar & Type Filter Badges */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-lg min-w-[260px]">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={matSearchTerm}
                  onChange={(e) => setMatSearchTerm(e.target.value)}
                  placeholder="Filter by material code, name, category, manufacturer..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                {['ALL', 'RAW', 'INTERMEDIATE', 'FINISHED', 'PACKAGING'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMatTypeFilter(type)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      matTypeFilter === type
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-400 font-mono self-center whitespace-nowrap">
              Showing {materials.filter(m => {
                const q = matSearchTerm.toLowerCase();
                const matchSearch = !q || (m.materialCode && m.materialCode.toLowerCase().includes(q)) || (m.materialName && m.materialName.toLowerCase().includes(q)) || (m.category && m.category.toLowerCase().includes(q)) || (m.manufacturer && m.manufacturer.toLowerCase().includes(q));
                return matchSearch && matchesMaterialType(m.materialType, matTypeFilter);
              }).length} of {materials.length} materials
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3 w-16 text-center">Image</th>
                  <th className="p-3">Material Code</th>
                  <th className="p-3">Material Name</th>
                  <th className="p-3">Material Type</th>
                  <th className="p-3">UOM</th>
                  <th className="p-3">Storage Conditions</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3 text-center">2D QR Label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {materials
                  .filter((m) => {
                    const q = matSearchTerm.toLowerCase();
                    const matchSearch = !q || (m.materialCode && m.materialCode.toLowerCase().includes(q)) || (m.materialName && m.materialName.toLowerCase().includes(q)) || (m.category && m.category.toLowerCase().includes(q)) || (m.manufacturer && m.manufacturer.toLowerCase().includes(q));
                    return matchSearch && matchesMaterialType(m.materialType, matTypeFilter);
                  })
                  .map((m) => {
                  const isStl = m.imagePath?.toLowerCase().endsWith('.stl');
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-center">
                        {m.imagePath ? (
                          isStl ? (
                            <button
                              type="button"
                              onClick={() => setZoomedFile(m.imagePath || null)}
                              className="w-11 h-11 flex flex-col items-center justify-center bg-slate-100 dark:bg-[#142A45] text-[#174A7C] dark:text-[#F5A623] hover:bg-slate-200 dark:hover:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg text-[9px] font-bold transition-all shadow-sm hover:scale-105 cursor-pointer mx-auto"
                              title="Click to view interactive 3D STL Model"
                            >
                              <span className="text-sm leading-none mb-0.5">📦</span>
                              <span>3D STL</span>
                            </button>
                          ) : (
                            <div
                              onClick={() => setZoomedFile(m.imagePath || null)}
                              className="relative group w-11 h-11 mx-auto cursor-zoom-in"
                              title="Click to zoom image"
                            >
                              <img
                                src={m.imagePath.startsWith('http') ? m.imagePath : getApiUrl(m.imagePath)}
                                alt={m.materialName}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (m.imagePath && !target.dataset.triedRelative) {
                                    target.dataset.triedRelative = 'true';
                                    target.src = m.imagePath;
                                  }
                                }}
                                className="w-11 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 group-hover:border-blue-500 group-hover:scale-105 transition-all shadow-sm bg-slate-100 dark:bg-slate-800 mx-auto"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-white text-xs drop-shadow">🔍</span>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="w-11 h-11 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-medium mx-auto select-none">
                            <span>No Pic</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-blue-500">{m.materialCode}</td>
                      <td className="p-3 font-semibold">{m.materialName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          m.materialType === 'FINISHED' || m.materialType === 'FINISHED_GOOD'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : m.materialType === 'INTERMEDIATE' || m.materialType === 'SEMI_FINISHED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            : m.materialType === 'PACKAGING'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                        }`}>
                          {m.materialType}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold">{m.uom}</td>
                      <td className="p-3 text-xs text-slate-400">{m.storageConditions}</td>
                      <td className="p-3 text-xs">{m.manufacturer}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQrLabel({
                              title: m.materialName,
                              sku: m.materialCode,
                              lotNumber: 'MTR-' + m.materialCode,
                              uom: m.uom,
                              status: m.status || 'RELEASED',
                              facility: 'UGAM PRECISION AUTOMOTIVE',
                              payloadJson: JSON.stringify({
                                type: 'MATERIAL_MASTER',
                                sku: m.materialCode,
                                name: m.materialName,
                                cat: m.category,
                                uom: m.uom,
                                mfg: m.manufacturer
                              })
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-[#174A7C] text-slate-700 dark:text-slate-200 hover:text-white border border-slate-300 dark:border-slate-600 text-xs font-semibold transition cursor-pointer active:scale-95"
                          title="Generate & Print 2D QR Code Label"
                        >
                          <QrCode size={13} className="text-blue-500 hover:text-white" />
                          <span>QR Label</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showCreateMaterial && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white">Add Material Definition</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateMaterial(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleCreateMaterial} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Material Code</label>
                    <input
                      type="text" required value={matCode} onChange={(e) => setMatCode(e.target.value)} placeholder="e.g. RM-001 or FG001"
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Material Name</label>
                    <input
                      type="text" required value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="e.g. Organic Pea Protein or Steel Bar"
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Material Type</label>
                      <select
                        value={matType}
                        onChange={(e) => setMatType(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                      >
                        {typeList.map(t => (
                          <option key={t.code} value={t.code}>
                            {t.description ? `${t.code} (${t.description})` : t.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Unit of Measure (UOM)</label>
                      <select
                        value={matUom}
                        onChange={(e) => setMatUom(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                      >
                        {uomList.map(u => (
                          <option key={u.code} value={u.code}>
                            {u.name ? `${u.code} (${u.name})` : u.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Manufacturer</label>
                    <input
                      type="text" required value={matMfg} onChange={(e) => setMatMfg(e.target.value)} placeholder="e.g. BioChem Supplies Inc"
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Qualified Vendor Partner</label>
                    <select
                      value={selectedVenId} onChange={(e) => setSelectedVenId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white text-slate-800"
                    >
                      {vendors.length === 0 ? (
                        <option value="">No vendors loaded</option>
                      ) : (
                        vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.vendorName}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Material Image/Model (JPG, PNG, STL)</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.stl"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowCreateMaterial(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Save Material</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: QUALIFIED SUPPLIERS & APPROVED VENDOR DIRECTORY TAB            */}
      {/* ========================================================================= */}
      {activeTab === 'vendors' && (
        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Qualified Pharmaceutical Raw Vendor Master</h3>
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3">Vendor Code</th>
                  <th className="p-3">Vendor Name</th>
                  <th className="p-3">Qualification Status</th>
                  <th className="p-3">Last Audit Date</th>
                  <th className="p-3">Contact Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{v.vendorCode}</td>
                    <td className="p-3 font-semibold">{v.vendorName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.qualificationStatus === 'QUALIFIED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {v.qualificationStatus}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono">{new Date(v.auditDate).toLocaleDateString()}</td>
                    <td className="p-3 text-xs text-slate-400">{v.contactInformation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: GOODS RECEIPT NOTE (GRN) & QA QUARANTINE DISPOSITION TAB       */}
      {/* ========================================================================= */}
      {activeTab === 'grn' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Goods Receipt Note (GRN) & Quarantine Inspections</h3>
              <p className="text-xs text-slate-400">Materials remain in quarantine until certified COA verification and double-operator release approval.</p>
            </div>
            {user?.role !== 'OPERATOR' && (
              <button
                onClick={() => {
                  if (materials.length > 0 && vendors.length > 0) {
                    setSelectedMatId(materials[0].id);
                    setSelectedVenId(vendors[0].id);
                  }
                  setShowCreateGrn(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
              >
                <Plus size={14} /> Log Incoming GRN
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3 w-16 text-center">Image</th>
                  <th className="p-3">GRN Number</th>
                  <th className="p-3">Raw Material</th>
                  <th className="p-3">Vendor Batch</th>
                  <th className="p-3">Qty Received</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Inspection State</th>
                  <th className="p-3 text-center">Approval Release</th>
                  <th className="p-3 text-center">2D QR Label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {grns.map((g) => {
                  const isStl = g.material?.imagePath?.toLowerCase().endsWith('.stl');
                  return (
                    <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-center">
                        {g.material?.imagePath ? (
                          isStl ? (
                            <button
                              type="button"
                              onClick={() => setZoomedFile(g.material.imagePath || null)}
                              className="w-11 h-11 flex flex-col items-center justify-center bg-slate-100 dark:bg-[#142A45] text-[#174A7C] dark:text-[#F5A623] hover:bg-slate-200 dark:hover:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg text-[9px] font-bold transition-all shadow-sm hover:scale-105 cursor-pointer mx-auto"
                              title="Click to view interactive 3D STL Model"
                            >
                              <span className="text-sm leading-none mb-0.5">📦</span>
                              <span>3D STL</span>
                            </button>
                          ) : (
                            <div
                              onClick={() => setZoomedFile(g.material.imagePath || null)}
                              className="relative group w-11 h-11 mx-auto cursor-zoom-in"
                              title="Click to zoom image"
                            >
                              <img
                                src={g.material.imagePath.startsWith('http') ? g.material.imagePath : getApiUrl(g.material.imagePath)}
                                alt={g.material.materialName}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (g.material?.imagePath && !target.dataset.triedRelative) {
                                    target.dataset.triedRelative = 'true';
                                    target.src = g.material.imagePath;
                                  }
                                }}
                                className="w-11 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 group-hover:border-blue-500 group-hover:scale-105 transition-all shadow-sm bg-slate-100 dark:bg-slate-800 mx-auto"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-white text-xs drop-shadow">🔍</span>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="w-11 h-11 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-medium mx-auto select-none">
                            <span>No Pic</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{g.grnNumber}</td>
                      <td className="p-3">
                        <span className="block font-bold">{g.material?.materialCode}</span>
                        <span className="text-xs text-slate-400">{g.material?.materialName}</span>
                      </td>
                      <td className="p-3 font-mono text-xs">{g.batchNumber}</td>
                      <td className="p-3 font-semibold">{g.quantityReceived} {g.material?.uom}</td>
                      <td className="p-3 text-xs font-mono text-slate-400">{new Date(g.expiryDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          g.status === 'RELEASED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                          g.status === 'PENDING_QC' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse' :
                          'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {g.status === 'PENDING_QC' ? 'QUARANTINED (QC)' : g.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          {g.status === 'PENDING_QC' && user?.role === 'QUALITY_ENGINEER' ? (
                            <button
                              onClick={() => triggerGrnStatusSignature(g.id)}
                              className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7C] text-slate-700 dark:text-slate-300 hover:text-white rounded border border-slate-300 dark:border-slate-700 transition text-xs font-bold cursor-pointer active:scale-95"
                            >
                              Verify & Release
                            </button>
                          ) : g.status === 'RELEASED' ? (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-500" /> RELEASED TO WH
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No Action</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQrLabel({
                              title: g.material?.materialName || 'Raw Material',
                              sku: g.material?.materialCode || '',
                              lotNumber: g.batchNumber,
                              heatNumber: (g as any).heatNumber || 'HEAT-88412-A',
                              vendorName: g.vendor?.vendorName || 'SUP-001',
                              expiryDate: g.expiryDate ? new Date(g.expiryDate).toISOString().split('T')[0] : '2028-08-15',
                              quantity: g.quantityReceived,
                              uom: g.material?.uom || 'KG',
                              status: g.status,
                              facility: 'UGAM PRECISION AUTOMOTIVE',
                              payloadJson: JSON.stringify({
                                type: 'RAW_MATERIAL',
                                sku: g.material?.materialCode,
                                name: g.material?.materialName,
                                lot: g.batchNumber,
                                grn: g.grnNumber,
                                heat: (g as any).heatNumber || 'HEAT-88412-A',
                                vendor: g.vendor?.vendorName,
                                qty: g.quantityReceived,
                                uom: g.material?.uom,
                                status: g.status
                              })
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 hover:bg-[#174A7C] text-blue-600 dark:text-blue-300 hover:text-white border border-blue-200 dark:border-blue-700 text-xs font-bold transition cursor-pointer active:scale-95"
                          title="Print 2D QR Thermal Label for Received Lot"
                        >
                          <QrCode size={13} />
                          <span>Print QR</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showCreateGrn && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 overflow-y-auto animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
                <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700/80">
                  <h3 className="text-lg font-bold dark:text-white">Log Goods Receipt Note (Quarantined Status)</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateGrn(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleCreateGrn} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">GRN Number</label>
                      <input
                        type="text" required value={grnNum} onChange={(e) => setGrnNum(e.target.value)} placeholder="GRN-2026-0001"
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Manufacturer Batch</label>
                      <input
                        type="text" required value={grnBatch} onChange={(e) => setGrnBatch(e.target.value)} placeholder="BATCH-1209"
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Material Master</label>
                    <select
                      value={selectedMatId} onChange={(e) => setSelectedMatId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white text-slate-800"
                    >
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.materialCode} - {m.materialName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Vendor Partner</label>
                    <select
                      value={selectedVenId} onChange={(e) => setSelectedVenId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white text-slate-800"
                    >
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.vendorName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Quantity Received</label>
                      <input
                        type="number" required value={grnQty} onChange={(e) => setGrnQty(Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Shelf Life (Days)</label>
                      <input
                        type="number" required value={grnExpiryDays} onChange={(e) => setGrnExpiryDays(Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                    <button type="button" onClick={() => setShowCreateGrn(false)} className="px-4 py-2 border dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Log GRN</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: WAREHOUSE FEFO INVENTORY & LOT PEDIGREE GENEALOGY TAB          */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stock inventory */}
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl p-3 lg:col-span-2 space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">FEFO Inventory Bin Stocks & Location Maps</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3 w-16 text-center">Image</th>
                  <th className="p-3">Lot Number</th>
                  <th className="p-3">Material Code</th>
                  <th className="p-3">UOM Balance</th>
                  <th className="p-3">Location Bin</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Expiry Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-sm dark:text-slate-300">
                {stocks.map((s) => {
                  const daysLeft = Math.ceil((new Date(s.materialBatch?.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isStl = s.materialBatch?.material?.imagePath?.toLowerCase().endsWith('.stl');
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-center">
                        {s.materialBatch?.material?.imagePath ? (
                          isStl ? (
                            <button
                              type="button"
                              onClick={() => setZoomedFile(s.materialBatch.material.imagePath || null)}
                              className="w-11 h-11 flex flex-col items-center justify-center bg-slate-100 dark:bg-[#142A45] text-[#174A7C] dark:text-[#F5A623] hover:bg-slate-200 dark:hover:bg-[#102237] border border-slate-300 dark:border-[#1F3A5C] rounded-lg text-[9px] font-bold transition-all shadow-sm hover:scale-105 cursor-pointer mx-auto"
                              title="Click to view interactive 3D STL Model"
                            >
                              <span className="text-sm leading-none mb-0.5">📦</span>
                              <span>3D STL</span>
                            </button>
                          ) : (
                            <div
                              onClick={() => setZoomedFile(s.materialBatch.material.imagePath || null)}
                              className="relative group w-11 h-11 mx-auto cursor-zoom-in"
                              title="Click to zoom image"
                            >
                              <img
                                src={s.materialBatch.material.imagePath.startsWith('http') ? s.materialBatch.material.imagePath : getApiUrl(s.materialBatch.material.imagePath)}
                                alt={s.materialBatch.material.materialName}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (s.materialBatch?.material?.imagePath && !target.dataset.triedRelative) {
                                    target.dataset.triedRelative = 'true';
                                    target.src = s.materialBatch.material.imagePath;
                                  }
                                }}
                                className="w-11 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 group-hover:border-blue-500 group-hover:scale-105 transition-all shadow-sm bg-slate-100 dark:bg-slate-800 mx-auto"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-white text-xs drop-shadow">🔍</span>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="w-11 h-11 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-medium mx-auto select-none">
                            <span>No Pic</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{s.materialBatch?.batchNumber}</td>
                      <td className="p-3">
                        <span className="block font-bold">{s.materialBatch?.material?.materialCode}</span>
                        <span className="text-[10px] text-slate-400">{s.materialBatch?.material?.materialName}</span>
                      </td>
                      <td className="p-3 font-semibold">{s.quantity} {s.materialBatch?.material?.uom}</td>
                      <td className="p-3 font-mono text-xs">{s.storageLocation?.code}</td>
                      <td className="p-3 font-mono text-xs text-slate-400">{new Date(s.materialBatch?.expiryDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          daysLeft <= 30 ? 'bg-red-500/10 text-red-500' :
                          daysLeft <= 90 ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {daysLeft <= 0 ? 'EXPIRED' : `${daysLeft} Days left`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Genealogy tracing search */}
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl p-3 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Material Traceability Search</h3>
              <p className="text-xs text-slate-400 mt-1">Search any active finished batch lot or raw lot to display electronic genealogy maps.</p>
            </div>
            <form onSubmit={handleTraceLookup} className="flex gap-2">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text" required value={traceLot} onChange={(e) => setTraceLot(e.target.value)} placeholder="Search e.g. PO-260003 or WO-2026-001"
                  className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded py-2 pl-9 pr-2 text-sm dark:text-white focus:outline-none"
                />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-xs transition">
                Trace
              </button>
            </form>

            {traceResult ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-xs space-y-3">
                <div className="pb-2 border-b dark:border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-slate-800 dark:text-slate-100">{traceResult.lotNumber}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">{traceResult.status}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-300 block uppercase tracking-wider font-bold">Consumable Ingredients:</span>
                  {traceResult.consumedMaterials?.length === 0 ? (
                    <span className="text-slate-400 italic">No direct component raw lots recorded.</span>
                  ) : (
                    traceResult.consumedMaterials.map((m: any) => (
                      <div key={m.lotNumber} className="flex justify-between py-1 border-b dark:border-slate-800/50 last:border-b-0">
                        <div>
                          <span className="font-bold text-blue-500">{m.lotNumber}</span>
                          <span className="text-slate-400 block text-[9px]">{m.productName}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-800 dark:text-slate-300">{m.quantityConsumed}</span>
                          <span className="text-slate-400 block text-[9px]">{m.supplier}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-1 pt-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-300 block uppercase tracking-wider font-bold">Operations Logs:</span>
                  {traceResult.operationsLogs?.map((l: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1 border-b dark:border-slate-800/50 last:border-b-0">
                      <div>
                        <span className="font-bold">{l.operation}</span>
                        <span className="text-slate-500 dark:text-slate-300 block text-[9px]">{l.machine} - {l.operator}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px]">{l.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-300 border border-dashed dark:border-slate-700/80 rounded-lg">
                Enter a Lot Number to visualize the genealogy chart.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: CLEANROOM WEIGHING & DISPENSING (METTLER TOLEDO & POKA-YOKE)   */}
      {/* ========================================================================= */}
      {activeTab === 'dispense' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Simulated scale display */}
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl p-3 lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b dark:border-slate-700/80">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Weighing scale Room</h3>
                <p className="text-xs text-slate-400">Select active recipe MBR to trigger FEFO allocation & dispense raw bulk lot.</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
                <Gauge size={14} /> SCALE ONLINE
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1.5">Target Batch Campaign</label>
                  <select
                    value={dispenseBatchId} onChange={(e) => setDispenseBatchId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white text-slate-800"
                  >
                    <option value="">Select Batch Campaign...</option>
                    {activeBatches.map(b => (
                      <option key={b.id} value={b.id}>{b.woNumber} - {b.productSku} ({b.status})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1.5">Material SKU</label>
                    <input
                      type="text" value={dispenseMatCode} onChange={(e) => setDispenseMatCode(e.target.value)} placeholder="MAT-API-APAP"
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1.5">Required Qty</label>
                    <input
                      type="number" value={dispenseReqQty} onChange={(e) => setDispenseReqQty(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleFEFOLookup}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-xs transition cursor-pointer"
                >
                  Allocate Stock (FEFO Check)
                </button>

                {/* Mandatory Container 2D QR Verification (Poka-Yoke) */}
                <div className="pt-2">
                  {drumVerified ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white">Drum 2D QR Verified ✓</div>
                          <div className="text-[10px] text-emerald-300 font-mono">
                            {scannedDrumInfo?.sku} • Lot {scannedDrumInfo?.lot} • Heat {scannedDrumInfo?.heat}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDrumVerified(false);
                          setScannedDrumInfo(null);
                        }}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Re-scan
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('DRUM_DISPENSE');
                        setShowQrScanner(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer animate-pulse"
                    >
                      <QrCode size={16} />
                      <span>Scan Raw Drum 2D QR (Unlock Scale)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Mettler Toledo Scale Interface Emulator */}
              <div className="p-5 bg-slate-900 dark:bg-slate-950 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl flex flex-col justify-between text-emerald-400 font-mono relative overflow-hidden shadow-inner min-h-[220px]">
                {/* Poka-Yoke Scale Lock Overlay */}
                {!drumVerified && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-4 z-10 space-y-2">
                    <Lock size={32} className="text-amber-400 animate-bounce" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      SCALE LOCKED (POKA-YOKE)
                    </span>
                    <p className="text-[10px] text-slate-400 max-w-[220px] font-sans">
                      Mandatory scan of source drum 2D QR code required to verify ingredient identity before scale sensor is unmasked.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('DRUM_DISPENSE');
                        setShowQrScanner(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold font-sans transition cursor-pointer flex items-center gap-1.5"
                    >
                      <QrCode size={14} /> Scan Drum QR Now
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-800 pb-2">
                  <span>MANUALLY RECORDED SCALE READING</span>
                  <span className={drumVerified ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {drumVerified ? 'READY FOR ENTRY' : 'STANDBY LOCKED'}
                  </span>
                </div>
                <div className="my-6 flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-300 block uppercase tracking-wider">NET WEIGHT</span>
                  <span className="text-5xl font-extrabold tracking-tight">{dispenseNet.toFixed(4)} <span className="text-xl">{dispenseAllocations[0]?.uom}</span></span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400 border-t border-slate-800 pt-3">
                  <div>
                    <span>TARE:</span>
                    <span className="ml-1 text-emerald-400">{dispenseTare.toFixed(1)} g</span>
                  </div>
                  <div>
                    <span>GROSS:</span>
                    <span className="ml-1 text-emerald-400">{dispenseGross.toFixed(1)} g</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-3"><label>Scale identifier<input required className="border p-2 w-full" value={dispenseScaleId} onChange={e=>setDispenseScaleId(e.target.value)}/></label><label>Container identifier<input required className="border p-2 w-full" value={containerId} onChange={e=>setContainerId(e.target.value)}/></label><label>Recorded tare ({dispenseAllocations[0]?.uom})<input type="number" min="0" step="0.0001" className="border p-2 w-full" value={dispenseTare} onChange={e=>{setDispenseTare(+e.target.value);setDispenseNet(Number((dispenseGross-+e.target.value).toFixed(4)));}}/></label><label>Recorded gross ({dispenseAllocations[0]?.uom})<input type="number" min="0" step="0.0001" className="border p-2 w-full" value={dispenseGross} onChange={e=>{setDispenseGross(+e.target.value);setDispenseNet(Number((+e.target.value-dispenseTare).toFixed(4)));}}/></label></div>
            {/* Allocated lot bins display */}
            {dispenseAllocations.length > 0 && (
              <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/25 rounded-xl space-y-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">FEFO Allocation Recommendation</span>
                <div className="space-y-1">
                  {dispenseAllocations.map((a: any) => (
                    <div key={a.batchId} className="flex justify-between text-xs py-1 border-b dark:border-slate-800/80 last:border-b-0 text-slate-300">
                      <span>Bin: <strong>{a.locationCode}</strong> (Lot: {a.batchNumber})</span>
                      <span>Allocated: <strong>{a.allocatedQuantity} {a.uom}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase">Witness Verifier:</span>
                <select
                  value={dispenseVerifierId} onChange={(e) => setDispenseVerifierId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-1.5 text-xs text-slate-800 dark:text-slate-300"
                >
                  {verifiers.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={triggerDispenseSignature}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition shadow-lg shadow-blue-600/20"
              >
                Validate & Dispense
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow rounded-xl p-3 space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Scale Clean validation</h3>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-xs space-y-3">
              <div className="flex justify-between text-slate-400">
                <span>Clean Room Status:</span>
                <span className="font-bold text-emerald-500">ISO CLASS 8 CERTIFIED</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Calibration Log:</span>
                <span className="font-mono text-emerald-400">{dispenseScaleId} PASSED</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Expiry calibration:</span>
                <span className="font-semibold text-slate-300">120 Days remaining</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: 21 CFR PART 11 DUAL ELECTRONIC SIGNATURE MODAL DIALOG          */}
      {/* ========================================================================= */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-4 max-w-md w-full shadow-2xl space-y-4 my-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b dark:border-slate-700/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">GMP Double E-Signature verification</h3>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-wider block">FDA 21 CFR PART 11 COMPLIANT WITNESS LOG</span>
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

            <form onSubmit={handleDoubleOperatorSign} className="space-y-4">
              {signError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  {signError}
                </div>
              )}

              {/* Operator Sign */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">
                  1. Operator E-Signature Password ({user?.name || user?.username})
                </label>
                <input
                  type="password" required value={operatorPassword} onChange={(e) => setOperatorPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white text-slate-800 focus:outline-none"
                />
              </div>

              {/* Verifier Sign */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">
                  2. Witness Verifier Password ({verifiers.find(v => v.id === dispenseVerifierId)?.name || 'Verifier'})
                </label>
                <input
                  type="password" required value={verifierPassword} onChange={(e) => setVerifierPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded p-2.5 text-sm dark:text-white text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700/80">
                <button
                  type="button" onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={isSigning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition shadow-lg shadow-blue-600/10"
                >
                  {isSigning ? 'Authorizing...' : 'Submit Double Sign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: 3D CAD STL ENGINEERING MODEL VIEWER MODAL                      */}
      {/* ========================================================================= */}
      {zoomedFile && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fadeIn"
          onClick={() => setZoomedFile(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-xl w-full shadow-2xl relative flex flex-col items-center justify-center gap-4 text-white animate-scaleUp my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedFile(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white font-bold text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 transition"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 self-start border-b border-slate-800 pb-3 w-full">
              <span className="text-lg">🖼️</span>
              <div>
                <h4 className="text-sm font-bold text-slate-200">
                  {zoomedFile.toLowerCase().endsWith('.stl') ? '3D CAD / STL Model Viewer' : 'Material Image Viewer'}
                </h4>
                <span className="text-[11px] text-slate-400 font-mono block">
                  {zoomedFile.split('/').pop()}
                </span>
              </div>
            </div>
            
            <div className="w-full flex items-center justify-center py-2 min-h-[280px]">
              {zoomedFile.toLowerCase().endsWith('.stl') ? (
                <StlViewer url={zoomedFile.startsWith('http') ? zoomedFile : getApiUrl(zoomedFile)} />
              ) : (
                <img
                  src={zoomedFile.startsWith('http') ? zoomedFile : getApiUrl(zoomedFile)}
                  alt="Enlarged Material"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.triedRelative) {
                      target.dataset.triedRelative = 'true';
                      target.src = zoomedFile;
                    }
                  }}
                  className="max-w-full max-h-[65vh] object-contain rounded-xl border border-slate-800 shadow-lg bg-slate-950/50"
                />
              )}
            </div>
            
            <div className="flex justify-between items-center w-full pt-3 border-t border-slate-800">
              <a
                href={zoomedFile.startsWith('http') ? zoomedFile : getApiUrl(zoomedFile)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 hover:underline"
              >
                Open original in new tab ↗
              </a>
              <button
                onClick={() => setZoomedFile(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 10: OPTICAL 2D QR CODE CAMERA & WEDGE SCANNER MODAL DIALOG       */}
      {/* ========================================================================= */}
      {showQrScanner && (
        <QrScannerModal
          title={
            scannerTarget === 'DRUM_DISPENSE'
              ? 'Raw Material Drum 2D QR Scanner'
              : '2D QR Code Scanner'
          }
          subtitle={
            scannerTarget === 'DRUM_DISPENSE'
              ? 'Scan physical container QR code (or use handheld 2D imager wedge / quick buttons below)'
              : 'Scan material, batch, or work order 2D QR code'
          }
          expectedSku={scannerTarget === 'DRUM_DISPENSE' ? (dispenseMatCode || 'RM-ST-001') : undefined}
          onScan={handleQrScan}
          onClose={() => {
            setShowQrScanner(false);
            setScannerTarget(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* SECTION 11: INDUSTRIAL 4" x 2" THERMAL LABEL PRINT PREVIEW MODAL          */}
      {/* ========================================================================= */}
      {activeQrLabel && (
        <IndustrialQrLabelModal
          data={activeQrLabel}
          onClose={() => setActiveQrLabel(null)}
        />
      )}
    </div>
  );
}
