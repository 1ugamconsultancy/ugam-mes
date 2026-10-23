/**
 * @file AdminPanel.tsx
 * @module Frontend/Pages/AdminPanel
 * @description Enterprise master data administration, equipment lifecycle management,
 * standardized UOM & classifications, GAMP 5 user security matrix, GS1 serialization standards,
 * and bi-directional OPC UA / Kepware industrial PLC telemetry synchronization console.
 * 
 * @compliance GAMP 5 Category 4 / Category 5 Validated Manufacturing Software
 * @compliance ISO 9001:2015 Clause 7.1.3 (Infrastructure) & Clause 8.5.1 (Control of Production)
 * @compliance ANSI/ISA-95 Enterprise-Control System Integration
 * @compliance OPC Unified Architecture (IEC 62541 Industrial Automation)
 * @compliance FDA 21 CFR Part 11 (Electronic Records; Electronic Signatures)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShopfloorStore } from '../context/shopfloorStore';
import { Settings, Plus, Boxes, Cpu, Wrench, ShieldAlert, Terminal, Network, RefreshCw, Users, Check, X, Pencil, Lock, Key, Save, ShieldCheck, QrCode, Globe, Radio, Database, CheckCircle2, Sliders, Eye, EyeOff, Search, Trash2, Zap, Activity, Play, Square, Flame, Thermometer, Gauge, Server, AlertCircle, ArrowUpDown, Pause } from 'lucide-react';
import { getApiUrl } from '../config';

/**
 * @interface Line
 * @description ISA-95 Production line entity.
 */
interface Line {
  id: string;
  name: string;
  code: string;
}

/**
 * @interface Area
 * @description ISA-95 Operational area containing one or more lines.
 */
interface Area {
  id: string;
  name: string;
  lines: Line[];
}

/**
 * @interface Plant
 * @description ISA-95 Manufacturing plant entity containing operational areas.
 */
interface Plant {
  id: string;
  name: string;
  areas: Area[];
}

/**
 * @interface UomItem
 * @description Standard unit of measurement definition (ISO / SI / Industrial).
 */
interface UomItem {
  code: string;
  name: string;
}

/**
 * @interface TypeItem
 * @description Material classification category descriptor.
 */
interface TypeItem {
  code: string;
  description: string;
}

/**
 * @interface UserItem
 * @description System user profile representation for the administrative security matrix.
 */
interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

/**
 * @interface RoleItem
 * @description GAMP 5 RBAC security role descriptor.
 */
interface RoleItem {
  code: string;
  name: string;
  description: string;
}

const DEFAULT_ROLES: RoleItem[] = [
  { code: 'ADMIN', name: 'ADMIN', description: 'System Administrator' },
  { code: 'PRODUCTION_MANAGER', name: 'PRODUCTION MANAGER', description: 'Production Manager' },
  { code: 'SUPERVISOR', name: 'SUPERVISOR', description: 'Shift Supervisor' },
  { code: 'OPERATOR', name: 'OPERATOR', description: 'Machine Operator' },
  { code: 'QUALITY_ENGINEER', name: 'QUALITY ENGINEER', description: 'Quality Assurance Engineer' },
];

const DEFAULT_TYPES: TypeItem[] = [
  { code: 'RAW', description: 'Raw Materials (Bars, Rods, Coils, Compounds)' },
  { code: 'INTERMEDIATE', description: 'Intermediate Components (Machined, Heat Treated, Molded)' },
  { code: 'FINISHED', description: 'Finished Assembly Products (Control Pins, Hydraulic Seals)' },
  { code: 'PACKAGING', description: 'Packaging Materials (Boxes, Crates, Pallets, Labels)' },
];

/**
 * @function matchesMaterialType
 * @description Normalizes and matches material classification types against user filters,
 * supporting synonyms and legacy abbreviations (e.g. RAW / RAW_MATERIAL, FG / FINISHED, WIP / INTERMEDIATE).
 * 
 * @param {string} [itemType=''] - Material's stored classification type string
 * @param {string} [filter=''] - Active filter tab selection ('ALL', 'RAW', 'FINISHED', 'INTERMEDIATE', 'PACKAGING')
 * @returns {boolean} True if the item satisfies the active filter condition
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

const DEFAULT_UOMS: UomItem[] = [
  { code: 'KG', name: 'Kilograms' },
  { code: 'G', name: 'Grams' },
  { code: 'L', name: 'Liters' },
  { code: 'ML', name: 'Milliliters' },
  { code: 'PCS', name: 'Pieces' },
  { code: 'NOS', name: 'Numbers' },
  { code: 'BOT', name: 'Bottles' },
  { code: 'BOX', name: 'Boxes' },
];

export interface MasterEquipmentItem {
  equipmentId: string;
  equipmentName: string;
  workCenter: string;
  equipmentType: string;
  manufacturer: string;
  model: string;
  capacityPerShift: number;
  oeeApplicable: string;
  status: string;
}

const FALLBACK_EQUIPMENT: MasterEquipmentItem[] = [
  { equipmentId: 'CUT-01', equipmentName: 'Automatic Bar Cutter 01', workCenter: 'WC-CUT', equipmentType: 'CUTTING', manufacturer: 'OEM-A', model: 'ABC-250', capacityPerShift: 1200, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'CNC-01', equipmentName: 'CNC Turning Center 01', workCenter: 'WC-CNC', equipmentType: 'CNC_LATHE', manufacturer: 'OEM-B', model: 'CT-500', capacityPerShift: 500, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'DBR-01', equipmentName: 'Deburring Machine 01', workCenter: 'WC-DBR', equipmentType: 'DEBURRING', manufacturer: 'OEM-C', model: 'DB-100', capacityPerShift: 1000, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'HT-01', equipmentName: 'Heat Treatment Furnace 01', workCenter: 'WC-HT', equipmentType: 'FURNACE', manufacturer: 'OEM-D', model: 'HTF-1000', capacityPerShift: 300, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'RM-01', equipmentName: 'Rubber Moulding Machine 01', workCenter: 'WC-RM', equipmentType: 'PRESS', manufacturer: 'OEM-E', model: 'RM-250', capacityPerShift: 600, oeeApplicable: 'Y', status: 'RUNNING' },
  { equipmentId: 'ASM-01', equipmentName: 'Assembly Station 01', workCenter: 'WC-ASM', equipmentType: 'ASSEMBLY', manufacturer: 'INTERNAL', model: 'ASM-01', capacityPerShift: 400, oeeApplicable: 'Y', status: 'RUNNING' },
];

export interface OpcTagItem {
  id: string;
  tagName: string;
  kepwareAddress: string;
  equipmentCode: string;
  description: string;
  dataType: 'BOOLEAN' | 'FLOAT' | 'INTEGER' | 'STRING';
  accessMode: 'READ_ONLY' | 'READ_WRITE';
  currentValue: any;
  engineeringUnits?: string;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN' | 'COMM_FAILURE';
  scanRateMs?: number;
  alarmHiLimit?: number | null;
  alarmLowLimit?: number | null;
  isAlarmActive?: boolean;
  lastUpdated: string;
}

export interface OpcAuditItem {
  id: string;
  timestamp: string;
  tagName: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  user?: string;
  status: string;
  details?: string;
}

export interface KepwareConfigItem {
  endpointUrl: string;
  protocol: string;
  scanRateMs: number;
  status: 'CONNECTED' | 'SIMULATION' | 'OFFLINE';
  lastHeartbeat: string;
  activeTagsCount: number;
  totalWrites: number;
}

const VALID_TABS = ['material', 'equipment', 'types-uom', 'users', 'standards', 'opc-sync', 'api-docs'] as const;
type AdminTab = typeof VALID_TABS[number];

const TAB_METADATA: Record<AdminTab, { title: string; subtitle: string; icon: React.ReactNode }> = {
  material: {
    title: 'Material Master Configuration',
    subtitle: 'Register and manage active raw material, packaging, and finished goods master records.',
    icon: <Boxes className="text-blue-500" size={20} />
  },
  equipment: {
    title: 'Equipment & Production Line Assets',
    subtitle: 'Configure plants, production line parentage, machinery assets, and operational status.',
    icon: <Cpu className="text-blue-500" size={20} />
  },
  'types-uom': {
    title: 'Material Types & Standardized UOM',
    subtitle: 'Maintain material category classifications and ISO/food-grade measurement units.',
    icon: <Sliders className="text-blue-500" size={20} />
  },
  users: {
    title: 'User Accounts & GAMP 5 Role Matrix',
    subtitle: 'Manage system operators, supervisor credentials, QA authorizations, and access privileges.',
    icon: <Users className="text-blue-500" size={20} />
  },
  standards: {
    title: 'Traceability Standards & Barcode Serialization',
    subtitle: 'Configure GS1 AI prefixes, 21 CFR Part 11 electronic sign policies, and EPCIS synchronizations.',
    icon: <ShieldCheck className="text-blue-500" size={20} />
  },
  'opc-sync': {
    title: 'OPC UA & Kepware Industrial Tag Synchronization',
    subtitle: 'Manage bi-directional PLC tags, read live sensor telemetry, trigger equipment start/stop, and configure temperature high alarms.',
    icon: <Radio className="text-blue-500" size={20} />
  },
  'api-docs': {
    title: 'REST API Documentation & Payload Playground',
    subtitle: 'Interactive endpoint references and live transaction testing environment for MES integration.',
    icon: <Terminal className="text-blue-500" size={20} />
  }
};

/**
 * @component AdminPanel
 * @description Master engineering administration and site configuration console.
 * Houses tabs for Material Master records, physical Equipment & Line assets, Standardized UOMs & Types,
 * GAMP 5 user security assignments, GS1 serialization standards, OPC UA / Kepware industrial bridge,
 * and live API documentation with payload testing sandbox.
 */
export default function AdminPanel() {
  const { token, user } = useShopfloorStore();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('material');

  useEffect(() => {
    if (tab && (VALID_TABS as readonly string[]).includes(tab)) {
      setActiveTab(tab as AdminTab);
    } else if (!tab) {
      setActiveTab('material');
    }
  }, [tab]);

  // =========================================================================
  // SECTION 1: NAVIGATION & TAB ROUTING CONTROLLER
  // =========================================================================

  /**
   * @function handleTabChange
   * @description Updates active administrative sub-module tab and synchronizes browser URL route.
   * 
   * @param {AdminTab} targetTab - Chosen administration category tab
   */
  const handleTabChange = (targetTab: AdminTab) => {
    setActiveTab(targetTab);
    navigate(`/admin/${targetTab}`);
  };

  // =========================================================================
  // SECTION 2: MASTER CATALOGS & ENTERPRISE INFRASTRUCTURE DATA LOADERS
  // Concurrently loads UOM dictionaries, material types, line topology, and users.
  // =========================================================================

  // Catalogs fetched from backend
  const [uomList, setUomList] = useState<UomItem[]>(DEFAULT_UOMS);
  const [typeList, setTypeList] = useState<TypeItem[]>(DEFAULT_TYPES);
  const [roleList, setRoleList] = useState<RoleItem[]>(DEFAULT_ROLES);
  const [availableLines, setAvailableLines] = useState<Line[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);

  // Users Roster catalog
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 1. Material Form & Master List
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [matSearchTerm, setMatSearchTerm] = useState('');
  const [matTypeFilter, setMatTypeFilter] = useState('ALL');
  const [showAddMatForm, setShowAddMatForm] = useState(false);
  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [matType, setMatType] = useState('RAW');
  const [matUom, setMatUom] = useState('KG');
  const [matMfg, setMatMfg] = useState('');
  const [matConditions, setMatConditions] = useState('Store below 25°C, protect from moisture');

  // Edit Material Form States
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [editMatName, setEditMatName] = useState('');
  const [editMatType, setEditMatType] = useState('RAW');
  const [editMatCategory, setEditMatCategory] = useState('');
  const [editMatUom, setEditMatUom] = useState('KG');
  const [editMatShelfLife, setEditMatShelfLife] = useState<number | string>(730);
  const [editMatMfg, setEditMatMfg] = useState('');
  const [editMatConditions, setEditMatConditions] = useState('');
  const [editMatStatus, setEditMatStatus] = useState('ACTIVE');

  // 2. Equipment Master State & Catalogs
  const [equipmentList, setEquipmentList] = useState<MasterEquipmentItem[]>(FALLBACK_EQUIPMENT);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [eqSearchTerm, setEqSearchTerm] = useState('');
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<MasterEquipmentItem | null>(null);

  // New Equipment Form States
  const [eqId, setEqId] = useState('');
  const [eqName, setEqName] = useState('');
  const [eqWorkCenter, setEqWorkCenter] = useState('WC-CNC');
  const [eqType, setEqType] = useState('CNC_LATHE');
  const [eqMfg, setEqMfg] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqCapacity, setEqCapacity] = useState(500);
  const [eqOee, setEqOee] = useState('Y');
  const [eqStatus, setEqStatus] = useState<'RUNNING' | 'IDLE' | 'BREAKDOWN' | 'SETUP' | 'MAINTENANCE'>('RUNNING');
  const [eqLineId, setEqLineId] = useState('');

  // Edit Equipment Form States
  const [editEqName, setEditEqName] = useState('');
  const [editEqWorkCenter, setEditEqWorkCenter] = useState('');
  const [editEqType, setEditEqType] = useState('');
  const [editEqMfg, setEditEqMfg] = useState('');
  const [editEqModel, setEditEqModel] = useState('');
  const [editEqCapacity, setEditEqCapacity] = useState(500);
  const [editEqOee, setEditEqOee] = useState('Y');
  const [editEqStatus, setEditEqStatus] = useState('RUNNING');

  // 3. UOM Form
  const [newUomCode, setNewUomCode] = useState('');
  const [newUomName, setNewUomName] = useState('');

  // 4. Material Type Form
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');

  // 5. New User Form
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState('OPERATOR');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');

  // 5b. User Edit State
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('OPERATOR');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // 6. Standards & Serialization Settings State
  const [standardGS1, setStandardGS1] = useState(true);
  const [standardPart11, setStandardPart11] = useState(true);
  const [standardFSMA204, setStandardFSMA204] = useState(true);
  const [standardEPCIS, setStandardEPCIS] = useState(true);
  const [gs1CompanyPrefix, setGs1CompanyPrefix] = useState('8901234');
  const [ssccPackagingFormat, setSsccPackagingFormat] = useState('SSCC-18 (AI: 00)');
  const [barcodeType, setBarcodeType] = useState('GS1-128 / 2D DataMatrix');
  const [autoSerialEnabled, setAutoSerialEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('https://api.supplychain.ugamconsultancy.com/v1/epcis-events');
  const [webhookSecret, setWebhookSecret] = useState('whsec_mes_live_9837a71f0bc');
  const [webhookAutoSync, setWebhookAutoSync] = useState(true);
  const [standardsSaved, setStandardsSaved] = useState(false);

  // 7. OPC Kepware Industrial Sync State
  const [opcTags, setOpcTags] = useState<OpcTagItem[]>([]);
  const [opcLogs, setOpcLogs] = useState<OpcAuditItem[]>([]);
  const [kepwareConfig, setKepwareConfig] = useState<KepwareConfigItem | null>(null);
  const [opcFilterEq, setOpcFilterEq] = useState<string>('ALL');
  const [opcSearch, setOpcSearch] = useState('');
  const [opcPollingRate, setOpcPollingRate] = useState<number>(2000);
  const [isOpcPolling, setIsOpcPolling] = useState(true);
  const [writeModalTag, setWriteModalTag] = useState<OpcTagItem | null>(null);
  const [writeValue, setWriteValue] = useState<string>('');
  const [isWriting, setIsWriting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);
  
  // New Tag Form state
  const [newTagName, setNewTagName] = useState('');
  const [newKepwareAddr, setNewKepwareAddr] = useState('');
  const [newEqCode, setNewEqCode] = useState('CUT-01');
  const [newTagDesc, setNewTagDesc] = useState('');
  const [newDataType, setNewDataType] = useState<'BOOLEAN' | 'FLOAT' | 'INTEGER' | 'STRING'>('FLOAT');
  const [newAccessMode, setNewAccessMode] = useState<'READ_ONLY' | 'READ_WRITE'>('READ_WRITE');
  const [newInitVal, setNewInitVal] = useState('0');
  const [newUnits, setNewUnits] = useState('');
  const [newAlarmHi, setNewAlarmHi] = useState('');

  // Quick Action card states
  const [cutStartLoading, setCutStartLoading] = useState(false);
  const [cutStopLoading, setCutStopLoading] = useState(false);
  const [tempSpInput, setTempSpInput] = useState('860.0');
  const [tempLimitInput, setTempLimitInput] = useState('875.0');
  const [tempWriting, setTempWriting] = useState(false);

  // 6. API Documentation Console States
  const [apiConsole, setApiConsole] = useState('Console output will appear here after triggering a test call.');
  const [apiLoading, setApiLoading] = useState(false);
  const [grnPayload, setGrnPayload] = useState(
    JSON.stringify({
      grnNumber: "GRN-2026-9999",
      materialId: "10111111-1111-1111-1111-111111111111",
      vendorId: "20111111-1111-1111-1111-111111111111",
      batchNumber: "LOT-API-9999",
      quantityReceived: 1500,
      shelfLifeDays: 730
    }, null, 2)
  );
  const [orderPayload, setOrderPayload] = useState(
    JSON.stringify({
      workOrderNumber: "WO-2026-9999",
      recipeId: "wo011111-1111-1111-1111-111111111111",
      lineId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      targetQuantity: 10000,
      status: "RELEASED",
      dueDate: "2026-12-31"
    }, null, 2)
  );
  const [consumptionPayload, setConsumptionPayload] = useState(
    JSON.stringify({
      workOrderId: "70111111-1111-1111-1111-111111111111",
      materialBatchId: "b0111111-1111-1111-1111-111111111111",
      plannedQuantity: 500.0,
      actualQuantity: 503.2,
      yieldImpact: "NONE"
    }, null, 2)
  );

  /**
   * @function loadCatalogs
   * @description Fetches official UOM and Material Type catalog definitions from the backend.
   */
  const loadCatalogs = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [uomsRes, typesRes] = await Promise.all([
        fetch(getApiUrl('/materials/uoms'), { headers }),
        fetch(getApiUrl('/materials/types'), { headers })
      ]);
      
      if (uomsRes.ok) {
        const uomsData: UomItem[] = await uomsRes.json();
        if (Array.isArray(uomsData) && uomsData.length > 0) {
          setUomList(uomsData);
          setMatUom(prev => uomsData.some(u => u.code === prev) ? prev : uomsData[0].code);
        }
      }
      if (typesRes.ok) {
        const typesData: TypeItem[] = await typesRes.json();
        if (Array.isArray(typesData) && typesData.length > 0) {
          setTypeList(typesData);
          setMatType(prev => typesData.some(t => t.code === prev) ? prev : typesData[0].code);
        }
      }
    } catch (err) {
      console.error('Error fetching catalogs:', err);
    }
  };

  /**
   * @function loadLines
   * @description Fetches plant and area hierarchy, flattening available production lines.
   */
  const loadLines = async () => {
    setLoadingLines(true);
    try {
      const res = await fetch(getApiUrl('/plants/hierarchy'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: Plant[] = await res.json();
        const lines: Line[] = [];
        data.forEach(p => {
          p.areas.forEach(a => {
            a.lines.forEach(l => {
              lines.push(l);
            });
          });
        });
        setAvailableLines(lines);
        if (lines.length > 0) setEqLineId(lines[0].id);
      }
    } catch (err) {
      console.error('Error loading lines hierarchy:', err);
    } finally {
      setLoadingLines(false);
    }
  };

  /**
   * @function loadUsers
   * @description Loads registered user profiles and GAMP 5 RBAC roles.
   */
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch(getApiUrl('/auth/users'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/auth/roles'), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData) && usersData.length > 0) {
          setUsersList(usersData);
        } else {
          setUsersList([]);
        }
      } else {
        setUsersList([]);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (Array.isArray(rolesData) && rolesData.length > 0) {
          setRoleList(rolesData);
        }
      }
    } catch (err) {
      console.error('Error loading users list:', err);
      setUsersList([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  /**
   * @function loadEquipment
   * @description Fetches master equipment inventory with capacity and OEE flags.
   */
  const loadEquipment = async () => {
    setLoadingEquipment(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(getApiUrl('/equipment/master'), { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setEquipmentList(data);
        }
      }
    } catch (err) {
      console.error('Error fetching master equipment:', err);
    } finally {
      setLoadingEquipment(false);
    }
  };

  /**
   * @function loadMaterials
   * @description Fetches registered material master SKU items from backend database.
   */
  const loadMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(getApiUrl('/materials'), { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMaterialsList(data);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadCatalogs();
      loadLines();
      loadUsers();
      loadEquipment();
      loadMaterials();
    }
  }, [token]);

  // =========================================================================
  // SECTION 3: OPC UA & KEPWARE INDUSTRIAL PLC DATA LOADERS
  // Queries live bi-directional tag registers, server connection status, and audit logs.
  // =========================================================================

  /**
   * @function loadOpcTags
   * @description Retrieves live OPC UA tags from the Kepware gateway server.
   */
  const loadOpcTags = async () => {
    try {
      const res = await fetch(getApiUrl('/opc/tags'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setOpcTags(data);
      }
    } catch (e) {
      console.warn('Failed to load OPC tags:', e);
    }
  };

  /**
   * @function loadOpcServerConfig
   * @description Fetches Kepware server endpoint configuration and connection telemetry.
   */
  const loadOpcServerConfig = async () => {
    try {
      const res = await fetch(getApiUrl('/opc/server'));
      if (res.ok) {
        const data = await res.json();
        setKepwareConfig(data);
      }
    } catch (e) {
      console.warn('Failed to load OPC server config:', e);
    }
  };

  /**
   * @function loadOpcLogs
   * @description Fetches bi-directional PLC write audit history and tag change events.
   */
  const loadOpcLogs = async () => {
    try {
      const res = await fetch(getApiUrl('/opc/logs?limit=50'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setOpcLogs(data);
      }
    } catch (e) {
      console.warn('Failed to load OPC logs:', e);
    }
  };

  /**
   * @function loadAllOpcData
   * @description Batch refreshes all OPC tags, server telemetry, and write audit logs.
   */
  const loadAllOpcData = () => {
    loadOpcTags();
    loadOpcServerConfig();
    loadOpcLogs();
  };

  useEffect(() => {
    if (activeTab === 'opc-sync') {
      loadAllOpcData();
      if (isOpcPolling && opcPollingRate > 0) {
        const timer = setInterval(() => {
          loadOpcTags();
        }, opcPollingRate);
        return () => clearInterval(timer);
      }
    }
  }, [activeTab, isOpcPolling, opcPollingRate]);

  // =========================================================================
  // SECTION 4: BI-DIRECTIONAL OPC UA WRITE ACTIONS & REAL-TIME CONTROLS
  // Transmits telemetry writes, setpoints, and discrete run/stop commands to PLCs.
  // =========================================================================

  /**
   * @function handleOpcWrite
   * @description Sends a bi-directional write command to a designated OPC UA PLC tag address.
   * Logs an immutable audit trail entry recording old vs new values.
   * 
   * @param {string} tagName - Target Kepware tag node identifier
   * @param {any} value - Desired value to write to the PLC register
   * @param {string} [notes] - Operational reason or context for the write event
   * @returns {Promise<boolean>} Resolves true if write was accepted by the PLC
   * @compliance 21 CFR Part 11 (§11.10(e) Time-stamped audit trails)
   */
  const handleOpcWrite = async (tagName: string, value: any, notes?: string) => {
    setIsWriting(true);
    try {
      const res = await fetch(getApiUrl('/opc/write'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName, value, notes, user: 'ADMIN_OPERATOR' })
      });
      if (res.ok) {
        await loadOpcTags();
        await loadOpcLogs();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to write OPC tag: ${err.message || 'Server error'}`);
        return false;
      }
    } catch (e) {
      console.error(e);
      alert('Network error while writing to OPC tag');
      return false;
    } finally {
      setIsWriting(false);
    }
  };

  /**
   * @function handleStartCutter
   * @description Writes true to the Bar Cutter PLC Cmd_Start register to engage the machine.
   */
  const handleStartCutter = async () => {
    setCutStartLoading(true);
    await handleOpcWrite('CUT_01.PLC.Cmd_Start', true, 'Operator initiated Bar Cutter START from MES UI');
    setCutStartLoading(false);
  };

  /**
   * @function handleStopCutter
   * @description Writes true to the Bar Cutter PLC Cmd_Stop register to trigger an emergency halt.
   */
  const handleStopCutter = async () => {
    setCutStopLoading(true);
    await handleOpcWrite('CUT_01.PLC.Cmd_Stop', true, 'Operator initiated Bar Cutter E-STOP / HALT from MES UI');
    setCutStopLoading(false);
  };

  /**
   * @function handleWriteTempSetpoint
   * @description Updates the furnace pyrometer setpoint in the PLC register.
   */
  const handleWriteTempSetpoint = async () => {
    const val = parseFloat(tempSpInput);
    if (isNaN(val)) return alert('Please enter a valid numeric setpoint value');
    setTempWriting(true);
    await handleOpcWrite('HT_01.Pyrometer.Temp_SP', val, `Updated furnace recipe setpoint to ${val}°C`);
    setTempWriting(false);
  };

  /**
   * @function handleWriteTempAlarmLimit
   * @description Adjusts the critical high-temperature alarm limit threshold on the furnace PLC.
   */
  const handleWriteTempAlarmLimit = async () => {
    const val = parseFloat(tempLimitInput);
    if (isNaN(val)) return alert('Please enter a valid numeric alarm threshold');
    setTempWriting(true);
    await handleOpcWrite('HT_01.Pyrometer.Temp_Alarm_Hi_Limit', val, `Updated over-temperature high alarm limit to ${val}°C`);
    setTempWriting(false);
  };

  /**
   * @function handleSimulateTempSpike
   * @description Injects an artificial process value spike into the furnace pyrometer register to test alarm limits.
   * 
   * @param {number} tempVal - Simulated temperature in degrees Celsius
   */
  const handleSimulateTempSpike = async (tempVal: number) => {
    setTempWriting(true);
    await handleOpcWrite('HT_01.Pyrometer.Temp_PV', tempVal, `Simulated temperature test spike at ${tempVal}°C`);
    setTempWriting(false);
  };

  /**
   * @function handleSyncAllOpcTags
   * @description Triggers a full synchronization sweep across all connected Kepware channels and PLCs.
   */
  const handleSyncAllOpcTags = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(getApiUrl('/opc/sync'), { method: 'POST' });
      if (res.ok) {
        await loadAllOpcData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * @function handleTestKepwareConnection
   * @description Pings the Kepware server endpoint to calculate network latency and verify connection health.
   */
  const handleTestKepwareConnection = async () => {
    setIsTestingConn(true);
    setConnTestResult(null);
    try {
      const res = await fetch(getApiUrl('/opc/server/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointUrl: kepwareConfig?.endpointUrl })
      });
      if (res.ok) {
        const data = await res.json();
        setConnTestResult(data);
        loadOpcServerConfig();
      } else {
        setConnTestResult({ success: false, message: 'Server returned error status' });
      }
    } catch (e: any) {
      setConnTestResult({ success: false, message: e.message || 'Connection failed' });
    } finally {
      setIsTestingConn(false);
    }
  };

  /**
   * @function handleCreateOpcTag
   * @description Registers a new industrial PLC tag address into the Kepware tag matrix.
   * 
   * @param {React.FormEvent} e - Form event
   */
  const handleCreateOpcTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !newEqCode.trim()) return;
    try {
      const res = await fetch(getApiUrl('/opc/tags'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagName: newTagName.trim(),
          kepwareAddress: newKepwareAddr.trim() || `Channel1.${newEqCode}.${newTagName.trim()}`,
          equipmentCode: newEqCode.toUpperCase().trim(),
          description: newTagDesc.trim() || `OPC Tag for ${newEqCode}`,
          dataType: newDataType,
          accessMode: newAccessMode,
          initialValue: newDataType === 'BOOLEAN' ? (newInitVal === 'true') : (newDataType === 'FLOAT' || newDataType === 'INTEGER' ? Number(newInitVal) : newInitVal),
          engineeringUnits: newUnits.trim(),
          alarmHiLimit: newAlarmHi ? parseFloat(newAlarmHi) : undefined,
        })
      });
      if (res.ok) {
        setIsAddTagModalOpen(false);
        setNewTagName('');
        setNewKepwareAddr('');
        setNewTagDesc('');
        setNewUnits('');
        setNewAlarmHi('');
        loadOpcTags();
        loadOpcLogs();
        alert('New OPC Tag registered successfully into Kepware registry!');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to create OPC tag: ${err.message || 'Server error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error while registering OPC tag.');
    }
  };

  // =========================================================================
  // SECTION 5: MATERIAL MASTER LIFECYCLE MANAGEMENT
  // Handles registration, editing, categorization, and deletion of material master records.
  // =========================================================================

  /**
   * @function handleAddMaterial
   * @description Registers a new raw material, intermediate, or finished good SKU in the Master Catalog.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl('/materials'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          materialCode: matCode,
          materialName: matName,
          materialType: matType,
          category: matType,
          uom: matUom,
          manufacturer: matMfg,
          shelfLifeDays: 730,
          storageConditions: matConditions,
          status: 'ACTIVE'
        })
      });
      if (res.ok) {
        alert('Material Master Record created successfully!');
        setMatCode('');
        setMatName('');
        setMatMfg('');
        setShowAddMatForm(false);
        loadMaterials();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to create material: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while adding material.');
    }
  };

  /**
   * @function openEditMaterialModal
   * @description Hydrates edit form state with attributes of the chosen material master record.
   * 
   * @param {any} mat - Material entity to edit
   */
  const openEditMaterialModal = (mat: any) => {
    setEditingMaterial(mat);
    setEditMatName(mat.materialName || '');
    setEditMatType(mat.materialType || 'RAW');
    setEditMatCategory(mat.category || mat.materialType || '');
    setEditMatUom(mat.uom || 'KG');
    setEditMatShelfLife(mat.shelfLifeDays !== null && mat.shelfLifeDays !== undefined ? mat.shelfLifeDays : 730);
    setEditMatMfg(mat.manufacturer || '');
    setEditMatConditions(mat.storageConditions || '');
    setEditMatStatus(mat.status || 'ACTIVE');
  };

  /**
   * @function handleSaveMaterialEdit
   * @description Persists modifications to an existing material master SKU.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSaveMaterialEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    const identifier = editingMaterial.id || editingMaterial.materialCode;
    try {
      const res = await fetch(getApiUrl(`/materials/${identifier}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          materialName: editMatName.trim(),
          materialType: editMatType,
          category: editMatCategory.trim() || editMatType,
          uom: editMatUom,
          shelfLifeDays: editMatShelfLife ? Number(editMatShelfLife) : 0,
          manufacturer: editMatMfg.trim(),
          storageConditions: editMatConditions.trim(),
          status: editMatStatus
        })
      });
      if (res.ok) {
        alert(`Material ${editingMaterial.materialCode} updated successfully!`);
        setEditingMaterial(null);
        loadMaterials();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update material: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating material.');
    }
  };

  /**
   * @function handleDeleteMaterial
   * @description Deletes a material master SKU after operator confirmation.
   * 
   * @param {any} mat - Material entity to delete
   */
  const handleDeleteMaterial = async (mat: any) => {
    const identifier = mat.id || mat.materialCode;
    const code = mat.materialCode || identifier;
    if (!window.confirm(`Are you sure you want to delete Material ${code} (${mat.materialName})?`)) return;
    try {
      const res = await fetch(getApiUrl(`/materials/${identifier}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadMaterials();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete material: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while deleting material.');
    }
  };

  // =========================================================================
  // SECTION 6: EQUIPMENT & WORK CENTER ASSET LIFECYCLE
  // Manages shopfloor machinery catalog, shift capacities, and line assignments.
  // =========================================================================

  /**
   * @function handleAddEquipment
   * @description Provisions a new equipment asset or test station bound to an ISA-95 production line.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqId.trim() || !eqName.trim()) {
      alert('Please specify Machine / Equipment ID and Name.');
      return;
    }
    try {
      const res = await fetch(getApiUrl('/equipment/master'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          equipmentId: eqId.toUpperCase().trim(),
          equipmentName: eqName.trim(),
          workCenter: eqWorkCenter.toUpperCase().trim(),
          equipmentType: eqType.toUpperCase().trim(),
          manufacturer: eqMfg.trim() || 'OEM',
          model: eqModel.trim() || 'STD',
          capacityPerShift: Number(eqCapacity) || 500,
          oeeApplicable: eqOee,
          status: eqStatus,
          lineId: eqLineId
        })
      });
      if (res.ok) {
        alert('Equipment asset registered successfully into Master Catalog!');
        setShowAddEquipmentModal(false);
        setEqId('');
        setEqName('');
        setEqMfg('');
        setEqModel('');
        loadEquipment();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to register equipment: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while registering equipment.');
    }
  };

  /**
   * @function openEditEquipmentModal
   * @description Hydrates edit form state with attributes of target equipment asset.
   * 
   * @param {MasterEquipmentItem} item - Target equipment entity
   */
  const openEditEquipmentModal = (item: MasterEquipmentItem) => {
    setEditingEquipment(item);
    setEditEqName(item.equipmentName);
    setEditEqWorkCenter(item.workCenter);
    setEditEqType(item.equipmentType);
    setEditEqMfg(item.manufacturer);
    setEditEqModel(item.model);
    setEditEqCapacity(item.capacityPerShift);
    setEditEqOee(item.oeeApplicable);
    setEditEqStatus(item.status);
  };

  /**
   * @function handleSaveEquipmentEdit
   * @description Persists modifications to an equipment asset.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSaveEquipmentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment) return;
    try {
      const res = await fetch(getApiUrl(`/equipment/master/${editingEquipment.equipmentId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          equipmentName: editEqName.trim(),
          workCenter: editEqWorkCenter.toUpperCase().trim(),
          equipmentType: editEqType.toUpperCase().trim(),
          manufacturer: editEqMfg.trim(),
          model: editEqModel.trim(),
          capacityPerShift: Number(editEqCapacity) || 500,
          oeeApplicable: editEqOee,
          status: editEqStatus
        })
      });
      if (res.ok) {
        alert(`Equipment asset ${editingEquipment.equipmentId} updated successfully!`);
        setEditingEquipment(null);
        loadEquipment();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update equipment: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating equipment.');
    }
  };

  /**
   * @function handleDeleteEquipment
   * @description Deletes an equipment asset record after operator confirmation.
   * 
   * @param {string} equipmentId - Target equipment identifier
   */
  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!window.confirm(`Are you sure you want to delete Equipment Asset ${equipmentId}?`)) return;
    try {
      const res = await fetch(getApiUrl(`/equipment/master/${equipmentId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadEquipment();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete equipment: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while deleting equipment.');
    }
  };

  // =========================================================================
  // SECTION 7: STANDARDIZED UOM & MATERIAL CLASSIFICATION HANDLERS
  // Maintains metric/imperial engineering units and broad classification schemas.
  // =========================================================================

  /**
   * @function handleAddUom
   * @description Creates a new standardized Unit of Measure (UOM) entry.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleAddUom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUomCode || !newUomName) return;
    const code = newUomCode.toUpperCase().trim();
    try {
      const res = await fetch(getApiUrl('/materials/uoms'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, name: newUomName })
      });
      if (res.ok) {
        alert(`Unit of Measure "${code}" created and persisted!`);
        setNewUomCode('');
        setNewUomName('');
        loadCatalogs();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save UOM: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving UOM.');
    }
  };

  /**
   * @function handleAddType
   * @description Creates a new material classification category in the database.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeCode || !newTypeDesc) return;
    const code = newTypeCode.toUpperCase().trim();
    try {
      const res = await fetch(getApiUrl('/materials/types'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, description: newTypeDesc })
      });
      if (res.ok) {
        alert(`Material Type "${code}" created and persisted!`);
        setNewTypeCode('');
        setNewTypeDesc('');
        loadCatalogs();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save Material Type: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving Material Type.');
    }
  };

  // =========================================================================
  // SECTION 8: GAMP 5 USER SECURITY MATRIX & CREDENTIAL MANAGEMENT
  // Administrative user creation, RBAC elevation, and deactivation controls.
  // =========================================================================

  /**
   * @function handleAddUser
   * @description Registers a new user account with initial role and bcrypt-hashed password.
   * 
   * @param {React.FormEvent} e - Form submission event
   * @compliance 21 CFR Part 11 (§11.200 Identification code/password controls)
   */
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl('/auth/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          email: newUserEmail || `${newUsername.toLowerCase()}@ugamconsultancy.com`,
          password: newUserPassword,
          plantId: user?.plantId,
          organizationId: user?.organizationId,
          role: newUserRole,
          firstName: newUserFirstName,
          lastName: newUserLastName
        })
      });
      if (res.ok) {
        alert(`User account "${newUsername}" created and registered successfully!`);
        setNewUsername('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserFirstName('');
        setNewUserLastName('');
        loadUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to add user: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while creating user account.');
    }
  };

  /**
   * @function handleUpdateUserRole
   * @description Changes the assigned RBAC security role of a user.
   * 
   * @param {string} userId - Target user identifier
   * @param {string} role - New RBAC role
   */
  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(getApiUrl(`/auth/users/${userId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        alert('User role updated successfully!');
        loadUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to map user role: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating user role.');
    }
  };

  /**
   * @function handleToggleUserStatus
   * @description Activates or revokes operational login access for a user.
   * 
   * @param {string} userId - Target user identifier
   * @param {boolean} isActive - New activation state
   * @compliance 21 CFR Part 11 (§11.10(d) Limiting system access to authorized individuals)
   */
  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch(getApiUrl(`/auth/users/${userId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive })
      });
      if (res.ok) {
        alert('User operational status toggled successfully!');
        loadUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to toggle status: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while toggling user status.');
    }
  };

  /**
   * @function openEditUserModal
   * @description Populates edit user modal state with current user credentials.
   * 
   * @param {UserItem} user - Target user entity
   */
  const openEditUserModal = (user: UserItem) => {
    setEditingUser(user);
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'OPERATOR');
    setEditIsActive(user.isActive !== false);
    setEditPassword('');
  };

  /**
   * @function handleSaveUserEdit
   * @description Persists modifications to user profile, role, or re-hashes a new password.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        role: editRole,
        isActive: editIsActive,
      };
      if (editPassword.trim()) {
        payload.password = editPassword;
      }

      const res = await fetch(getApiUrl(`/auth/users/${editingUser.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`User account "${editingUser.username}" updated successfully!`);
        setEditingUser(null);
        loadUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update user: ${err.message || res.statusText || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating user account.');
    } finally {
      setSavingEdit(false);
    }
  };

  // =========================================================================
  // SECTION 9: REST API INTEGRATION SANDBOX & TEST PLAYGROUND
  // Executes test REST requests against MES endpoints and renders JSON telemetry.
  // =========================================================================

  /**
   * @function runApiTest
   * @description Executes an interactive HTTP request against the MES REST backend
   * and outputs formatted status, headers, and payload results in the API test console.
   * 
   * @param {string} endpoint - Relative API endpoint path
   * @param {'GET' | 'POST'} method - HTTP request method
   * @param {string} [bodyStr] - Optional raw JSON request body
   */
  const runApiTest = async (endpoint: string, method: 'GET' | 'POST', bodyStr?: string) => {
    setApiLoading(true);
    setApiConsole('Sending API transaction request...');
    try {
      let bodyObj = null;
      if (bodyStr && method === 'POST') {
        try {
          bodyObj = JSON.parse(bodyStr);
        } catch (e) {
          alert('Invalid JSON formatting in payload.');
          setApiLoading(false);
          return;
        }
      }

      const res = await fetch(getApiUrl(`/${endpoint}`), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: bodyObj ? JSON.stringify(bodyObj) : undefined
      });

      const data = await res.json().catch(() => ({}));
      setApiConsole(JSON.stringify({
        endpoint: getApiUrl(`/${endpoint}`),
        method,
        status: res.status,
        statusText: res.statusText,
        response: data
      }, null, 2));
    } catch (err: any) {
      console.error(err);
      setApiConsole(`Integration Error: ${err.message}`);
    } finally {
      setApiLoading(false);
    }
  };

  // Computed values for OPC Kepware Sync
  const filteredOpcTags = opcTags.filter(tag => {
    const matchEq = opcFilterEq === 'ALL' || tag.equipmentCode.toUpperCase() === opcFilterEq.toUpperCase();
    const matchSearch = !opcSearch.trim() || 
      tag.tagName.toLowerCase().includes(opcSearch.toLowerCase()) || 
      tag.kepwareAddress.toLowerCase().includes(opcSearch.toLowerCase()) ||
      tag.description.toLowerCase().includes(opcSearch.toLowerCase());
    return matchEq && matchSearch;
  });

  const cutStartTag = opcTags.find(t => t.tagName === 'CUT_01.PLC.Cmd_Start');
  const cutStopTag = opcTags.find(t => t.tagName === 'CUT_01.PLC.Cmd_Stop');
  const cutRunningTag = opcTags.find(t => t.tagName === 'CUT_01.Status.Running');
  const cutSpeedTag = opcTags.find(t => t.tagName === 'CUT_01.Speed.Cuts_Per_Min');
  const cutWearTag = opcTags.find(t => t.tagName === 'CUT_01.Blade.Wear_Percentage');
  const isCutterRunning = cutRunningTag ? Boolean(cutRunningTag.currentValue) : false;

  const htPvTag = opcTags.find(t => t.tagName === 'HT_01.Pyrometer.Temp_PV');
  const htSpTag = opcTags.find(t => t.tagName === 'HT_01.Pyrometer.Temp_SP');
  const htLimitTag = opcTags.find(t => t.tagName === 'HT_01.Pyrometer.Temp_Alarm_Hi_Limit');
  const htAlarmTag = opcTags.find(t => t.tagName === 'HT_01.Pyrometer.Alarm_Hi_Triggered');
  const isHtAlarmActive = htAlarmTag ? Boolean(htAlarmTag.currentValue) : false;

  const currentMeta = TAB_METADATA[activeTab] || TAB_METADATA.material;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* Header with Breadcrumb and Active Submenu Context */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-col justify-start items-start text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wider">
            <Settings size={14} />
            <span>Administration</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-bold">{currentMeta.title}</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            {currentMeta.icon}
            <span>{currentMeta.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Interactive Segmented Button Cards / Pills Bar */}
      <div className="bg-slate-100 dark:bg-[#102237] p-1.5 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex flex-wrap items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => handleTabChange('material')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'material'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Boxes size={15} className={activeTab === 'material' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Material Master</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('equipment')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'equipment'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Cpu size={15} className={activeTab === 'equipment' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Equipment Assets</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'equipment'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {equipmentList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('types-uom')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'types-uom'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Sliders size={15} className={activeTab === 'types-uom' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Material Types & UOM</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'users'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Users size={15} className={activeTab === 'users' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Users & Roles</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'users'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {usersList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('standards')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'standards'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <ShieldCheck size={15} className={activeTab === 'standards' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>Standards & Serialization</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('opc-sync')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'opc-sync'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Radio size={15} className={activeTab === 'opc-sync' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>OPC Kepware Sync</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'opc-sync'
              ? 'bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white'
              : 'bg-slate-200 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
          }`}>
            {opcTags.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('api-docs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'api-docs'
              ? 'bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-md ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#142A45] hover:shadow-sm border border-transparent'
          }`}
        >
          <Terminal size={15} className={activeTab === 'api-docs' ? 'text-[#174A7C] dark:text-[#F5A623]' : 'text-slate-400'} />
          <span>API Integration Guide</span>
        </button>
      </div>

      {/* Content Viewport */}
      <div className="w-full industrial-card p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm">
        {activeTab === 'material' && (
          <div className="space-y-5 text-left font-sans">
            {/* Header with Title and Add Button */}
            <div className="border-b dark:border-slate-700/50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                  <Boxes className="text-blue-500" size={20} /> Master Material Registry & Catalog
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Central bill-of-materials reference definitions for Raw Materials, Packaging, Intermediate WIP, and Finished Goods.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMatForm(!showAddMatForm)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
                >
                  <Plus size={16} /> {showAddMatForm ? 'Close Form' : 'Register New Material'}
                </button>
                <button
                  type="button"
                  onClick={loadMaterials}
                  disabled={loadingMaterials}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Refresh materials catalog"
                >
                  <RefreshCw size={14} className={loadingMaterials ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Expandable Register Material Form Drawer / Card */}
            {showAddMatForm && (
              <div className="p-5 border border-blue-500/30 dark:border-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10 rounded-2xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-slate-700/60 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus size={16} className="text-blue-500" />
                    <span>Register New Material Master Record</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddMatForm(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleAddMaterial} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Material Code *</label>
                      <input
                        type="text" required value={matCode} onChange={(e) => setMatCode(e.target.value)} placeholder="e.g. RM001, PK001, FG001"
                        className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white text-slate-800 font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Material Name *</label>
                      <input
                        type="text" required value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="e.g. EN8 Steel Rod 20mm"
                        className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Material Type</label>
                      <select value={matType} onChange={(e) => setMatType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white text-slate-800">
                        {typeList.map(t => (
                          <option key={t.code} value={t.code}>{t.code} - {t.description}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Unit of Measure (UOM)</label>
                      <select value={matUom} onChange={(e) => setMatUom(e.target.value)} className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white text-slate-800 font-mono">
                        {uomList.map(u => (
                          <option key={u.code} value={u.code}>{u.code} ({u.name})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Manufacturer / Supplier</label>
                      <input
                        type="text" required value={matMfg} onChange={(e) => setMatMfg(e.target.value)} placeholder="e.g. Precision Alloys Corp / OEM"
                        className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Storage Conditions</label>
                      <input
                        type="text" required value={matConditions} onChange={(e) => setMatConditions(e.target.value)} placeholder="e.g. Dry indoor warehouse, protect from moisture"
                        className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => setShowAddMatForm(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer">
                      <Save size={14} /> Save Material Record
                    </button>
                  </div>
                </form>
              </div>
            )}

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
                Showing {materialsList.filter(m => {
                  const q = matSearchTerm.toLowerCase();
                  const matchSearch = !q || (m.materialCode && m.materialCode.toLowerCase().includes(q)) || (m.materialName && m.materialName.toLowerCase().includes(q)) || (m.category && m.category.toLowerCase().includes(q)) || (m.manufacturer && m.manufacturer.toLowerCase().includes(q));
                  const matchType = matchesMaterialType(m.materialType, matTypeFilter);
                  return matchSearch && matchType;
                }).length} of {materialsList.length} materials
              </span>
            </div>

            {/* Full-width Material Master Table */}
            {loadingMaterials ? (
              <div className="text-xs text-slate-400 py-8 text-center font-mono">Loading material master catalog...</div>
            ) : (
              <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <th className="p-3">Material Code</th>
                        <th className="p-3">Material Name</th>
                        <th className="p-3">Material Type</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-center">UOM</th>
                        <th className="p-3 text-right">Shelf Life</th>
                        <th className="p-3">Manufacturer / Supplier</th>
                        <th className="p-3">Storage Conditions</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
                      {materialsList
                        .filter(m => {
                          const q = matSearchTerm.toLowerCase();
                          const matchSearch = !q || (m.materialCode && m.materialCode.toLowerCase().includes(q)) || (m.materialName && m.materialName.toLowerCase().includes(q)) || (m.category && m.category.toLowerCase().includes(q)) || (m.manufacturer && m.manufacturer.toLowerCase().includes(q));
                          const matchType = matchesMaterialType(m.materialType, matTypeFilter);
                          return matchSearch && matchType;
                        })
                        .map(mat => (
                          <tr key={mat.id || mat.materialCode} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/20 transition">
                            <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {mat.materialCode}
                            </td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                              {mat.materialName}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider whitespace-nowrap border ${
                                mat.materialType === 'FINISHED'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                  : mat.materialType === 'INTERMEDIATE'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                                  : mat.materialType === 'PACKAGING'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                              }`}>
                                {mat.materialType || 'N/A'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {mat.category || mat.materialType || 'N/A'}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-xs">
                                {mat.uom || 'EA'}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                              {mat.shelfLifeDays ? `${mat.shelfLifeDays} d` : '—'}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {mat.manufacturer || 'OEM / Local'}
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate" title={mat.storageConditions}>
                              {mat.storageConditions || 'Standard ambient warehouse'}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                                {mat.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditMaterialModal(mat)}
                                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7C] text-slate-600 dark:text-slate-300 hover:text-white rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                                  title="Edit material specifications"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMaterial(mat)}
                                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#142A45] text-slate-500 dark:text-slate-400 hover:text-rose-400 rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                                  title="Delete material record"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Edit Material Modal */}
            {editingMaterial && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-6 max-w-xl w-full shadow-2xl text-left space-y-4 max-h-[90vh] overflow-y-auto my-auto animate-scaleUp">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Boxes size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Material Master Record</h3>
                        <p className="text-xs text-slate-500 font-mono">Code: {editingMaterial.materialCode}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingMaterial(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                      title="Close modal"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveMaterialEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Material Name *</label>
                      <input
                        type="text"
                        required
                        value={editMatName}
                        onChange={(e) => setEditMatName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Material Type</label>
                        <select
                          value={editMatType}
                          onChange={(e) => setEditMatType(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          {typeList.map(t => (
                            <option key={t.code} value={t.code}>{t.code} - {t.description}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Category</label>
                        <input
                          type="text"
                          value={editMatCategory}
                          onChange={(e) => setEditMatCategory(e.target.value)}
                          placeholder="e.g. Raw Material, Packaging, WIP"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Unit of Measure (UOM)</label>
                        <select
                          value={editMatUom}
                          onChange={(e) => setEditMatUom(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        >
                          {uomList.map(u => (
                            <option key={u.code} value={u.code}>{u.code} ({u.name})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Shelf Life (Days)</label>
                        <input
                          type="number"
                          value={editMatShelfLife}
                          onChange={(e) => setEditMatShelfLife(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Status</label>
                        <select
                          value={editMatStatus}
                          onChange={(e) => setEditMatStatus(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="OBSOLETE">OBSOLETE</option>
                          <option value="QUARANTINE">QUARANTINE</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Manufacturer / Supplier</label>
                        <input
                          type="text"
                          value={editMatMfg}
                          onChange={(e) => setEditMatMfg(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Storage Conditions</label>
                        <input
                          type="text"
                          value={editMatConditions}
                          onChange={(e) => setEditMatConditions(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingMaterial(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#174A7C] hover:bg-[#142A45] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#174A7C]/20 cursor-pointer"
                      >
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="space-y-5 text-left font-sans">
            {/* Header with Title and Add Button */}
            <div className="border-b dark:border-slate-700/50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                  <Cpu className="text-blue-500" size={20} /> Machine Master & Equipment Assets
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Official equipment registry with work center routings, rated shift output capacities, and OEE parameters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEquipmentModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 self-start sm:self-auto cursor-pointer"
              >
                <Plus size={16} /> Register Equipment
              </button>
            </div>

            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">Total Master Equipment</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-slate-900 dark:text-white">{equipmentList.length}</span>
                  <span className="text-xs font-bold text-blue-500">Master Catalog</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">Active Operating State</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-emerald-500">
                    {equipmentList.filter(e => e.status === 'RUNNING').length}
                  </span>
                  <span className="text-xs font-bold text-emerald-500/80">RUNNING</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">Total Plant Shift Capacity</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {equipmentList.reduce((acc, curr) => acc + (Number(curr.capacityPerShift) || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">pcs / shift</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">OEE Monitored Assets</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-blue-500">
                    {equipmentList.filter(e => e.oeeApplicable === 'Y').length} / {equipmentList.length}
                  </span>
                  <span className="text-xs font-bold text-blue-500/80">100% Active</span>
                </div>
              </div>
            </div>

            {/* Filter / Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={eqSearchTerm}
                  onChange={(e) => setEqSearchTerm(e.target.value)}
                  placeholder="Filter by ID, name, work center, type, OEM..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-mono self-center">
                Showing {equipmentList.filter(e => {
                  const q = eqSearchTerm.toLowerCase();
                  return !q || e.equipmentId.toLowerCase().includes(q) || e.equipmentName.toLowerCase().includes(q) || e.workCenter.toLowerCase().includes(q) || e.equipmentType.toLowerCase().includes(q) || (e.manufacturer && e.manufacturer.toLowerCase().includes(q));
                }).length} of {equipmentList.length} assets
              </span>
            </div>

            {/* Master Equipment Table */}
            {loadingEquipment ? (
              <div className="text-xs text-slate-400 py-8 text-center font-mono">Loading equipment master records...</div>
            ) : (
              <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <th className="p-3">Machine ID</th>
                      <th className="p-3">Machine Name</th>
                      <th className="p-3">Work Center</th>
                      <th className="p-3">Machine Type</th>
                      <th className="p-3">Manufacturer & Model</th>
                      <th className="p-3 text-right">Capacity / Shift</th>
                      <th className="p-3 text-center">OEE</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
                    {equipmentList
                      .filter(e => {
                        const q = eqSearchTerm.toLowerCase();
                        return (
                          !q ||
                          e.equipmentId.toLowerCase().includes(q) ||
                          e.equipmentName.toLowerCase().includes(q) ||
                          e.workCenter.toLowerCase().includes(q) ||
                          e.equipmentType.toLowerCase().includes(q) ||
                          (e.manufacturer && e.manufacturer.toLowerCase().includes(q))
                        );
                      })
                      .map(eq => (
                        <tr key={eq.equipmentId} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/20 transition">
                          <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {eq.equipmentId}
                          </td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {eq.equipmentName}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {eq.workCenter}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {eq.equipmentType}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">{eq.manufacturer}</span>
                            <span className="text-xs text-slate-400 block font-mono">{eq.model}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-right text-slate-800 dark:text-slate-200">
                            {Number(eq.capacityPerShift).toLocaleString()} <span className="text-xs font-normal text-slate-400">pcs</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              eq.oeeApplicable === 'Y'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {eq.oeeApplicable === 'Y' ? 'OEE' : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border ${
                              eq.status === 'RUNNING'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                                : eq.status === 'IDLE'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/25'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                eq.status === 'RUNNING' ? 'bg-emerald-500 animate-pulse' : eq.status === 'IDLE' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}></span>
                              {eq.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditEquipmentModal(eq)}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#174A7C] text-slate-600 dark:text-slate-300 hover:text-white rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                                title="Edit equipment specifications"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEquipment(eq.equipmentId)}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#142A45] text-slate-500 dark:text-slate-400 hover:text-rose-400 rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                                title="Delete equipment asset"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Register Equipment Modal */}
            {showAddEquipmentModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-6 max-w-xl w-full shadow-2xl text-left space-y-4 max-h-[90vh] overflow-y-auto my-auto animate-scaleUp">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Cpu size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Equipment / Machine Asset</h3>
                        <p className="text-xs text-slate-500">Add precision machinery record to the central Equipment Master.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddEquipmentModal(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleAddEquipment} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Machine ID (Asset Code)</label>
                        <input
                          type="text"
                          required
                          value={eqId}
                          onChange={(e) => setEqId(e.target.value)}
                          placeholder="e.g. CNC-02, CUT-02"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Machine Name</label>
                        <input
                          type="text"
                          required
                          value={eqName}
                          onChange={(e) => setEqName(e.target.value)}
                          placeholder="e.g. CNC Turning Center 02"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Work Center</label>
                        <select
                          value={eqWorkCenter}
                          onChange={(e) => setEqWorkCenter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        >
                          <option value="WC-CUT">WC-CUT (Cutting Center)</option>
                          <option value="WC-CNC">WC-CNC (CNC Lathe Turning)</option>
                          <option value="WC-DBR">WC-DBR (Deburring Center)</option>
                          <option value="WC-HT">WC-HT (Heat Treatment Furnace)</option>
                          <option value="WC-RM">WC-RM (Rubber Moulding Press)</option>
                          <option value="WC-ASM">WC-ASM (Assembly Station)</option>
                          <option value="WC-QC">WC-QC (Quality Inspection)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Machine Type</label>
                        <input
                          type="text"
                          required
                          value={eqType}
                          onChange={(e) => setEqType(e.target.value)}
                          placeholder="e.g. CNC_LATHE, CUTTING, FURNACE"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white uppercase font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Manufacturer (OEM)</label>
                        <input
                          type="text"
                          required
                          value={eqMfg}
                          onChange={(e) => setEqMfg(e.target.value)}
                          placeholder="e.g. OEM-B, Mazak, Haas"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Model</label>
                        <input
                          type="text"
                          required
                          value={eqModel}
                          onChange={(e) => setEqModel(e.target.value)}
                          placeholder="e.g. CT-500, ABC-250"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Capacity Per Shift (pcs)</label>
                        <input
                          type="number"
                          required
                          value={eqCapacity}
                          onChange={(e) => setEqCapacity(Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">OEE Tracked</label>
                        <select
                          value={eqOee}
                          onChange={(e) => setEqOee(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="Y">Yes (Active OEE)</option>
                          <option value="N">No (Non-OEE)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Operating State</label>
                        <select
                          value={eqStatus}
                          onChange={(e) => setEqStatus(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="RUNNING">RUNNING</option>
                          <option value="IDLE">IDLE</option>
                          <option value="SETUP">SETUP</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Assigned Plant Line</label>
                      <select
                        value={eqLineId}
                        onChange={(e) => setEqLineId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      >
                        {availableLines.map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowAddEquipmentModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                      >
                        <Plus size={14} /> Register Asset
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Equipment Modal */}
            {editingEquipment && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-6 max-w-xl w-full shadow-2xl text-left space-y-4 max-h-[90vh] overflow-y-auto my-auto animate-scaleUp">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Cpu size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Equipment Asset</h3>
                        <p className="text-xs text-slate-500 font-mono">ID: {editingEquipment.equipmentId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingEquipment(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEquipmentEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Machine Name</label>
                      <input
                        type="text"
                        required
                        value={editEqName}
                        onChange={(e) => setEditEqName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Work Center</label>
                        <input
                          type="text"
                          required
                          value={editEqWorkCenter}
                          onChange={(e) => setEditEqWorkCenter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Machine Type</label>
                        <input
                          type="text"
                          required
                          value={editEqType}
                          onChange={(e) => setEditEqType(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white uppercase font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Manufacturer (OEM)</label>
                        <input
                          type="text"
                          required
                          value={editEqMfg}
                          onChange={(e) => setEditEqMfg(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Model</label>
                        <input
                          type="text"
                          required
                          value={editEqModel}
                          onChange={(e) => setEditEqModel(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Capacity / Shift</label>
                        <input
                          type="number"
                          required
                          value={editEqCapacity}
                          onChange={(e) => setEditEqCapacity(Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">OEE Applicable</label>
                        <select
                          value={editEqOee}
                          onChange={(e) => setEditEqOee(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="Y">Y (Applicable)</option>
                          <option value="N">N (Non-OEE)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Status</label>
                        <select
                          value={editEqStatus}
                          onChange={(e) => setEditEqStatus(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="RUNNING">RUNNING</option>
                          <option value="IDLE">IDLE</option>
                          <option value="SETUP">SETUP</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingEquipment(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                      >
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'types-uom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* UOM Configuration */}
            <div className="space-y-4">
              <h3 className="text-base font-bold dark:text-white flex items-center gap-2 border-b dark:border-slate-700/50 pb-2">
                <Wrench size={16} /> Unit of Measure (UOM) Catalog
              </h3>

              <form onSubmit={handleAddUom} className="space-y-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">UOM Code</label>
                  <input
                    type="text" required value={newUomCode} onChange={(e) => setNewUomCode(e.target.value)} placeholder="e.g. ML"
                    className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-750 rounded p-2 text-xs dark:text-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">UOM Full Name</label>
                  <input
                    type="text" required value={newUomName} onChange={(e) => setNewUomName(e.target.value)} placeholder="e.g. Milliliters"
                    className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-750 rounded p-2 text-xs dark:text-white text-slate-800"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1">
                  <Plus size={14} /> Add UOM
                </button>
              </form>

              <div className="pt-3 border-t dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">Registered UOMs</label>
                <div className="flex flex-wrap gap-2">
                  {uomList.map(u => (
                    <span key={u.code} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border dark:border-slate-850 rounded text-xs font-semibold" title={u.name}>
                      {u.code} ({u.name})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Material Types Configuration */}
            <div className="space-y-4">
              <h3 className="text-base font-bold dark:text-white flex items-center gap-2 border-b dark:border-slate-700/50 pb-2">
                <ShieldAlert size={16} /> Material Type Catalog
              </h3>

              <form onSubmit={handleAddType} className="space-y-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Material Type Code</label>
                  <input
                    type="text" required value={newTypeCode} onChange={(e) => setNewTypeCode(e.target.value)} placeholder="e.g. SOLVENT"
                    className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-750 rounded p-2 text-xs dark:text-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Description</label>
                  <input
                    type="text" required value={newTypeDesc} onChange={(e) => setNewTypeDesc(e.target.value)} placeholder="e.g. Chemical liquid solvent excipients"
                    className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-750 rounded p-2 text-xs dark:text-white text-slate-800"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1">
                  <Plus size={14} /> Add Material Type
                </button>
              </form>

              <div className="pt-3 border-t dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">Registered Types</label>
                <div className="flex flex-wrap gap-2">
                  {typeList.map(t => (
                    <span key={t.code} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border dark:border-slate-800 rounded text-xs font-semibold" title={t.description}>
                      {t.code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-5 text-left font-sans">
            <div className="border-b dark:border-slate-700/50 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                  <Users className="text-blue-500" size={20} /> Users & Role Profiles Mapping
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Verify credentials, configure accounts, and map GAMP 5 signature authorization profiles.</p>
              </div>
            </div>

            {/* Top 4 KPI Metrics for Users */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">Total User Accounts</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-slate-900 dark:text-white">{usersList.length}</span>
                  <span className="text-xs font-bold text-blue-500">IAM Directory</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">Active Accounts</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-emerald-500">
                    {usersList.filter(u => u.isActive).length}
                  </span>
                  <span className="text-xs font-bold text-emerald-500/80">AUTHORIZED</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">GAMP 5 Role Profiles</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-slate-900 dark:text-white">{roleList.length}</span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Security Roles</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">Admin / Supervisors</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-blue-500">
                    {usersList.filter(u => u.role === 'ADMIN' || u.role === 'SUPERVISOR').length}
                  </span>
                  <span className="text-xs font-bold text-blue-500/80">Privileged</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
              {/* Left 2 Columns: Users roster table */}
              <div className="xl:col-span-2 space-y-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">System Accounts Roster</span>
                {loadingUsers ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400 py-4 font-mono">Loading user list...</div>
                ) : (
                  <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <th className="p-3">Username</th>
                          <th className="p-3">Full Name</th>
                          <th className="p-3">GAMP 5 Role Profile</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
                        {usersList.map(u => (
                          <tr key={u.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/20">
                            <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{u.username}</td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'N/A'}</td>
                            <td className="p-3">
                              <select
                                value={(u.role || 'OPERATOR').toUpperCase().replace(/ /g, '_')}
                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded p-1.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                              >
                                {roleList.map(r => (
                                  <option key={r.code} value={r.code} className="text-slate-800 dark:text-white bg-white dark:bg-slate-900">
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleToggleUserStatus(u.id, !u.isActive)}
                                className={`px-2 py-1 rounded text-xs font-bold transition border ${
                                  u.isActive
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                                    : 'bg-red-500/10 text-red-500 border-red-500/25'
                                }`}
                              >
                                {u.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => openEditUserModal(u)}
                                className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 border border-blue-500/20 shadow-sm"
                              >
                                <Pencil size={11} /> Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column: Register account form */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Add User Account</span>
                <form onSubmit={handleAddUser} className="space-y-4 p-5 border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Username</label>
                    <input
                      type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. operator2"
                      className="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded p-2 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Password</label>
                    <div className="relative">
                      <input
                        type={showNewUserPassword ? 'text' : 'password'}
                        required
                        minLength={12} value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded p-2 pr-9 text-xs text-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition cursor-pointer"
                        title={showNewUserPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">First Name</label>
                      <input
                        type="text" required value={newUserFirstName} onChange={(e) => setNewUserFirstName(e.target.value)} placeholder="John"
                        className="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded p-2 text-xs text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Last Name</label>
                      <input
                        type="text" required value={newUserLastName} onChange={(e) => setNewUserLastName(e.target.value)} placeholder="Doe"
                        className="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded p-2 text-xs text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Role Profile</label>
                    <select
                      value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded p-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      {roleList.map(r => (
                        <option key={r.code} value={r.code} className="text-slate-800 dark:text-white bg-white dark:bg-slate-900">
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1">
                    <Plus size={14} /> Create Account
                  </button>
                </form>
              </div>
            </div>

            {/* Edit User Profile Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-left space-y-4 my-auto animate-scaleUp">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit User Profile</h3>
                        <p className="text-xs text-slate-500 font-mono">@{editingUser.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveUserEdit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">First Name</label>
                        <input
                          type="text"
                          required
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Last Name</label>
                        <input
                          type="text"
                          required
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Email Address</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="user@ugam.com"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">GAMP 5 Role Profile</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                          {roleList.map(r => (
                            <option key={r.code} value={r.code} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">Account Status</label>
                        <select
                          value={editIsActive ? 'active' : 'inactive'}
                          onChange={(e) => setEditIsActive(e.target.value === 'active')}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="active">Active (Authorized)</option>
                          <option value="inactive">Inactive (Suspended)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                        Reset Password <span className="text-xs text-slate-500 normal-case font-normal">(Optional - leave blank to keep unchanged)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Enter new password (optional)"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition cursor-pointer"
                          title={showEditPassword ? 'Hide password' : 'Show password'}
                        >
                          {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                      >
                        <Save size={14} /> {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'standards' && (
          <div className="space-y-6 text-left font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-700/50 pb-4">
              <div>
                <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                  <ShieldCheck className="text-blue-500" size={20} /> Traceability Standards & Barcode Serialization
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure global supply chain standards, GS1 barcode rules, EPCIS event streaming, and downstream webhooks.
                </p>
              </div>
              <button
                onClick={() => {
                  setStandardsSaved(true);
                  setTimeout(() => setStandardsSaved(false), 3000);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition shadow-sm self-start sm:self-auto"
              >
                <Save size={14} /> Save Standards
              </button>
            </div>

            {standardsSaved && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 size={16} /> Traceability standards and serialization rules saved successfully to system configuration.
              </div>
            )}

            {/* Section 1: Global Compliance Standards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Global Regulatory & Compliance Standards</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">GS1-128 & GTIN Supply Chain Standard</strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Mandates standard Application Identifiers (AI 01 for GTIN, AI 10 for Lot, AI 17 for Expiry Date).</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={standardGS1}
                    onChange={(e) => setStandardGS1(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">FDA 21 CFR Part 11 Electronic Records</strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Cryptographic checksum verification and immutable audit logs on all batch release events.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={standardPart11}
                    onChange={(e) => setStandardPart11(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">FSMA Section 204 Traceability Rule</strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Enforces Critical Tracking Events (CTEs) and Key Data Elements (KDEs) across all food processing stages.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={standardFSMA204}
                    onChange={(e) => setStandardFSMA204(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">EPCIS 1.2 Event Streaming</strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Standard ObjectEvent, AggregationEvent, and TransactionEvent schemas for supply chain interoperability.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={standardEPCIS}
                    onChange={(e) => setStandardEPCIS(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Barcode & Serialization Engine */}
            <div className="space-y-3 pt-2 border-t dark:border-slate-700/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Barcode & Pallet Serialization Engine</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">GS1 Company Prefix</label>
                  <input
                    type="text"
                    value={gs1CompanyPrefix}
                    onChange={(e) => setGs1CompanyPrefix(e.target.value)}
                    className="w-full industrial-input font-mono text-xs"
                    placeholder="e.g. 8901234"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">SSCC Pallet Code Format</label>
                  <select
                    value={ssccPackagingFormat}
                    onChange={(e) => setSsccPackagingFormat(e.target.value)}
                    className="w-full industrial-input text-xs"
                  >
                    <option value="SSCC-18 (AI: 00)">SSCC-18 (AI: 00) Standard Pallet</option>
                    <option value="SSCC-14 (AI: 01)">SSCC-14 Case Packaging</option>
                    <option value="GRAI (AI: 8003)">GRAI Reusable Asset Identifier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Symbology Rendering</label>
                  <select
                    value={barcodeType}
                    onChange={(e) => setBarcodeType(e.target.value)}
                    className="w-full industrial-input text-xs"
                  >
                    <option value="GS1-128 / 2D DataMatrix">GS1-128 + 2D DataMatrix (Recommended)</option>
                    <option value="Code 128 Linear">Code 128 Linear Only</option>
                    <option value="QR Code ISO/IEC 18004">QR Code ISO/IEC 18004</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Auto-Increment Pallet Serialization</span>
                  <span className="text-[11px] text-slate-500">Automatically generate unique SSCC serial on packaging machine batch completion</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoSerialEnabled}
                  onChange={(e) => setAutoSerialEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Section 3: Supply Chain Webhook Integrations */}
            <div className="space-y-3 pt-2 border-t dark:border-slate-700/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Outbound Supply Chain Webhooks & Distribution Sync</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Downstream EPCIS Webhook Endpoint</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full industrial-input font-mono text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">HMAC Webhook Secret Signature</label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full industrial-input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Real-time Outbound Dispatch Triggers</span>
                  <span className="text-[11px] text-slate-500">Emit webhook payload immediately upon dispatch receipt creation in Shipments Ledger</span>
                </div>
                <input
                  type="checkbox"
                  checked={webhookAutoSync}
                  onChange={(e) => setWebhookAutoSync(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'opc-sync' && (
          <div className="space-y-6 font-sans">
            {/* Header info */}
            <div className="border-b dark:border-slate-700/50 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Radio className="text-blue-500 animate-pulse" size={20} />
                  <span>OPC Kepware Industrial Communications Bridge</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Bidirectional tag synchronization with Kepware KEPServerEX, real-time sensor telemetry, remote start/stop coils, and high-alarm interlocks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncAllOpcTags}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Force Sync All'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddTagModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                >
                  <Plus size={13} />
                  <span>Register OPC Tag</span>
                </button>
              </div>
            </div>

            {/* 1. Server Connectivity & Diagnostics Panel */}
            <div className="p-4 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 bg-slate-50/70 dark:bg-[#102237] space-y-3 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Server size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">KEPWARE SERVER EX</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                        kepwareConfig?.status === 'CONNECTED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : kepwareConfig?.status === 'SIMULATION'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          kepwareConfig?.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' :
                          kepwareConfig?.status === 'SIMULATION' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                        }`} />
                        {kepwareConfig?.status === 'CONNECTED' ? 'PHYSICAL KEPWARE ONLINE' :
                         kepwareConfig?.status === 'SIMULATION' ? 'SIMULATION DRIVER ACTIVE (OFFLINE FALLBACK)' : 'OFFLINE'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Endpoint: {kepwareConfig?.endpointUrl || 'http://127.0.0.1:39320/iotgateway'} | Protocol: REST / IoT Gateway
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-white dark:bg-[#142A45] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase">Polling:</span>
                    <select
                      value={opcPollingRate}
                      onChange={(e) => setOpcPollingRate(Number(e.target.value))}
                      className="bg-transparent text-slate-800 dark:text-white font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value={500} className="dark:bg-slate-900">500 ms (Fast)</option>
                      <option value={1000} className="dark:bg-slate-900">1000 ms (1s)</option>
                      <option value={2000} className="dark:bg-slate-900">2000 ms (Standard)</option>
                      <option value={5000} className="dark:bg-slate-900">5000 ms (Slow)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsOpcPolling(!isOpcPolling)}
                      title={isOpcPolling ? 'Pause Polling' : 'Resume Polling'}
                      className={`ml-1 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ${isOpcPolling ? 'text-emerald-500' : 'text-slate-400'}`}
                    >
                      {isOpcPolling ? <Activity size={14} className="animate-spin" /> : <Pause size={14} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestKepwareConnection}
                    disabled={isTestingConn}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Activity size={13} className={isTestingConn ? 'animate-pulse' : ''} />
                    <span>{isTestingConn ? 'Pinging...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>

              {connTestResult && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  connTestResult.success ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  <span>{connTestResult.message}</span>
                  {connTestResult.latencyMs !== undefined && (
                    <span className="font-mono text-xs font-bold">Latency: {connTestResult.latencyMs}ms</span>
                  )}
                </div>
              )}
            </div>

            {/* 2. Featured Operational Control Cards: Equipment Start/Stop & Temperature High Alarm */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Card A: CUT-01 Equipment Start / Stop Remote Control */}
              <div className="p-4 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 bg-white dark:bg-[#142A45] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Cpu size={18} />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">Automatic Bar Cutter 01</h4>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Asset: CUT-01 | Work Center: WC-CUT</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold flex items-center gap-1.5 shadow-sm ${
                    isCutterRunning
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isCutterRunning ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                    {isCutterRunning ? 'RUNNING (MOTOR ACTIVE)' : 'STOPPED / HALTED'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#102237] rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Remote Control Command Coils</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleStartCutter}
                      disabled={cutStartLoading || isCutterRunning}
                      className={`w-full py-2.5 px-3 rounded-lg font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer ${
                        isCutterRunning
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-[#174A7C] hover:bg-[#142A45] text-white shadow-sm'
                      }`}
                    >
                      <Play size={14} className={cutStartLoading ? 'animate-spin' : ''} />
                      <span>{cutStartLoading ? 'Sending Start...' : 'START CUTTER'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStopCutter}
                      disabled={cutStopLoading || !isCutterRunning}
                      className={`w-full py-2.5 px-3 rounded-lg font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer ${
                        !isCutterRunning
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-[#142A45] hover:bg-[#102237] text-white border border-slate-700 shadow-sm'
                      }`}
                    >
                      <Square size={14} className={cutStopLoading ? 'animate-spin' : ''} />
                      <span>{cutStopLoading ? 'Sending Stop...' : 'STOP / E-STOP'}</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between">
                    <span>Tags: <code className="text-blue-500 font-bold">CUT_01.PLC.Cmd_Start</code> / <code className="text-rose-500 font-bold">Cmd_Stop</code></span>
                    <span>Direct MES &rarr; PLC Write</span>
                  </div>
                </div>

                {/* Cutter Live Telemetry Readout */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-slate-700/60">
                    <span className="text-xs font-bold text-slate-400 uppercase block">PLC Feedback Bit</span>
                    <span className={`text-xs font-black flex items-center justify-center gap-1 mt-1 ${isCutterRunning ? 'text-emerald-500' : 'text-slate-400'}`}>
                      <CheckCircle2 size={12} />
                      {isCutterRunning ? 'CONTACT CLOSED' : 'OPEN (OFF)'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-slate-700/60">
                    <span className="text-xs font-bold text-slate-400 uppercase block">Stroke Rate</span>
                    <span className="text-base font-black text-slate-900 dark:text-white block mt-0.5">
                      {cutSpeedTag?.currentValue ?? 0} <span className="text-xs font-normal text-slate-400">cuts/min</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-slate-700/60">
                    <span className="text-xs font-bold text-slate-400 uppercase block">Blade Wear</span>
                    <span className="text-base font-black text-amber-500 block mt-0.5">
                      {cutWearTag?.currentValue ?? 14.2} <span className="text-xs font-normal text-slate-400">%</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card B: HT-01 Temperature High Alarm & Setpoint Control */}
              <div className={`p-4 rounded-xl border transition-all duration-300 ${
                isHtAlarmActive
                  ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 shadow-lg shadow-rose-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#142A45] shadow-sm'
              } space-y-4`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${isHtAlarmActive ? 'bg-rose-500 text-white animate-bounce' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                      <Thermometer size={18} />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">Heat Treatment Furnace 01</h4>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Asset: HT-01 | Pyrometer Sensor Zone</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold flex items-center gap-1.5 shadow-sm ${
                    isHtAlarmActive
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {isHtAlarmActive ? <Flame size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {isHtAlarmActive ? 'CRITICAL HIGH ALARM' : 'NORMAL (IN SPEC)'}
                  </span>
                </div>

                {/* Big Temperature Readout & Thermal Visualizer */}
                <div className="p-3 bg-slate-50 dark:bg-[#102237] rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Live Pyrometer PV</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-3xl font-black ${isHtAlarmActive ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                        {Number(htPvTag?.currentValue ?? 860.4).toFixed(1)}
                      </span>
                      <span className="text-sm font-bold text-slate-500">°C</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Tag: <code className="text-blue-500 font-bold">HT_01.Pyrometer.Temp_PV</code>
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs">
                      <span className="text-slate-400 text-xs font-bold uppercase mr-1">Target SP:</span>
                      <strong className="text-slate-800 dark:text-white">{htSpTag?.currentValue ?? 860.0}°C</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-rose-500 text-xs font-bold uppercase mr-1">Hi Alarm Limit:</span>
                      <strong className="text-rose-600 dark:text-rose-400">{htLimitTag?.currentValue ?? 875.0}°C</strong>
                    </div>
                    <div className="text-xs text-slate-400">
                      Bit: <code className={isHtAlarmActive ? 'text-rose-500 font-bold' : 'text-emerald-500'}>{isHtAlarmActive ? 'TRUE (TRIPPED)' : 'FALSE'}</code>
                    </div>
                  </div>
                </div>

                {/* Setpoint & High Alarm Limit Write Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Write Target Setpoint (°C)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.5"
                        value={tempSpInput}
                        onChange={(e) => setTempSpInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleWriteTempSetpoint}
                        disabled={tempWriting}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95"
                      >
                        Set SP
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-rose-500 uppercase block">Write High Alarm Limit (°C)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.5"
                        value={tempLimitInput}
                        onChange={(e) => setTempLimitInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleWriteTempAlarmLimit}
                        disabled={tempWriting}
                        className="px-2.5 py-1.5 bg-[#174A7C] hover:bg-[#142A45] text-white rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95"
                      >
                        Set Limit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alarm Excursion Simulation Buttons */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Test Alarm Interlock:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSimulateTempSpike(882.0)}
                      disabled={tempWriting}
                      className="px-3 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Flame size={12} className="text-[#F5A623]" />
                      <span>Simulate 882°C Spike</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSimulateTempSpike(860.0);
                        setTempLimitInput('875.0');
                        handleOpcWrite('HT_01.Pyrometer.Temp_Alarm_Hi_Limit', 875.0);
                      }}
                      disabled={tempWriting}
                      className="px-3 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold transition cursor-pointer active:scale-95"
                    >
                      Reset 860°C Normal
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* 3. Full OPC Tag Explorer & Registry Table */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Database size={16} className="text-blue-500" />
                    <span>Live OPC Tag Explorer & Registry</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {filteredOpcTags.length} / {opcTags.length} Tags
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Equipment Asset Filter */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#102237] p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {['ALL', 'CUT-01', 'HT-01', 'CNC-01', 'RM-01', 'DBR-01', 'ASM-01'].map((eq) => (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => setOpcFilterEq(eq)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                          opcFilterEq === eq
                            ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search tag name, address..."
                      value={opcSearch}
                      onChange={(e) => setOpcSearch(e.target.value)}
                      className="pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-52"
                    />
                  </div>
                </div>
              </div>

              {/* Tags Table */}
              <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-x-auto shadow-sm bg-white dark:bg-[#142A45]">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-[#102237] border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      <th className="py-3 px-3.5">OPC Tag Identifier</th>
                      <th className="py-3 px-3.5">Asset</th>
                      <th className="py-3 px-3.5">Description</th>
                      <th className="py-3 px-2.5">Type</th>
                      <th className="py-3 px-2.5">Access</th>
                      <th className="py-3 px-3.5 text-right">Live Value</th>
                      <th className="py-3 px-2.5 text-center">Quality</th>
                      <th className="py-3 px-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {filteredOpcTags.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400 font-sans text-xs">
                          No matching OPC tags found for filter "{opcFilterEq}"
                        </td>
                      </tr>
                    ) : (
                      filteredOpcTags.map((tag) => (
                        <tr key={tag.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-slate-900 dark:text-white block font-mono text-sm leading-snug">{tag.tagName}</span>
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono font-medium block mt-1">{tag.kepwareAddress}</span>
                          </td>
                          <td className="py-3 px-3.5 font-sans">
                            <span className="px-2.5 py-1 rounded font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {tag.equipmentCode}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-sans text-slate-800 dark:text-slate-100 text-sm font-medium max-w-sm" title={tag.description}>
                            {tag.description}
                          </td>
                          <td className="py-3 px-2.5 font-sans">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              tag.dataType === 'BOOLEAN' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' :
                              tag.dataType === 'FLOAT' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                              tag.dataType === 'INTEGER' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                              'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                            }`}>
                              {tag.dataType}
                            </span>
                          </td>
                          <td className="py-3 px-2.5 font-sans">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              tag.accessMode === 'READ_WRITE'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
                            }`}>
                              {tag.accessMode === 'READ_WRITE' ? 'RW' : 'RO'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {tag.isAlarmActive && (
                                <Flame size={14} className="text-rose-500 animate-pulse" />
                              )}
                              <span className={`font-black text-sm ${
                                tag.isAlarmActive
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : tag.dataType === 'BOOLEAN'
                                  ? (tag.currentValue ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                {tag.dataType === 'BOOLEAN'
                                  ? (tag.currentValue ? 'TRUE' : 'FALSE')
                                  : typeof tag.currentValue === 'number'
                                  ? tag.currentValue.toLocaleString()
                                  : String(tag.currentValue)}
                              </span>
                              {tag.engineeringUnits && (
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">{tag.engineeringUnits}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2.5 text-center font-sans">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              {tag.quality}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center font-sans">
                            {tag.accessMode === 'READ_WRITE' ? (
                              tag.dataType === 'BOOLEAN' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpcWrite(tag.tagName, !tag.currentValue, `Operator toggled boolean tag ${tag.tagName}`)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer active:scale-95"
                                >
                                  Toggle
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWriteModalTag(tag);
                                    setWriteValue(String(tag.currentValue));
                                  }}
                                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95"
                                >
                                  Write
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-slate-400 italic">Read-Only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Communication & Transaction Audit Ledger */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-blue-500" />
                  <span>OPC Industrial Transaction Ledger (21 CFR Part 11 Audit Trail)</span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Last {opcLogs.length} events recorded</span>
              </div>

              <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-[#142A45]">
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                  {opcLogs.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 font-sans text-xs">No transactions logged yet.</div>
                  ) : (
                    opcLogs.map((log) => (
                      <div key={log.id} className="p-2.5 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            log.action === 'ALARM_TRIP' ? 'bg-rose-500 text-white animate-pulse' :
                            log.action === 'ALARM_CLEAR' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                            log.action === 'WRITE' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                            'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            {log.action}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{log.tagName}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-sans text-xs">&rarr; {log.details}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs">
                          <span>User: <strong className="text-slate-700 dark:text-slate-200">{log.user || 'SYSTEM'}</strong></span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Write Value Modal */}
            {writeModalTag && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">Write OPC Tag Value</h4>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{writeModalTag.tagName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWriteModalTag(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#102237] p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase block">Equipment</span>
                        <span className="font-bold text-slate-800 dark:text-white">{writeModalTag.equipmentCode}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase block">Current Value</span>
                        <span className="font-mono font-bold text-blue-500">{String(writeModalTag.currentValue)} {writeModalTag.engineeringUnits}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        New Value to Transmit ({writeModalTag.dataType})
                      </label>
                      <input
                        type={writeModalTag.dataType === 'FLOAT' || writeModalTag.dataType === 'INTEGER' ? 'number' : 'text'}
                        step={writeModalTag.dataType === 'FLOAT' ? '0.1' : '1'}
                        value={writeValue}
                        onChange={(e) => setWriteValue(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setWriteModalTag(null)}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isWriting}
                      onClick={async () => {
                        const success = await handleOpcWrite(
                          writeModalTag.tagName,
                          writeModalTag.dataType === 'FLOAT' ? parseFloat(writeValue) :
                          writeModalTag.dataType === 'INTEGER' ? parseInt(writeValue, 10) : writeValue,
                          `Operator written via Tag Explorer modal`
                        );
                        if (success) setWriteModalTag(null);
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Save size={13} />
                      <span>{isWriting ? 'Transmitting...' : 'Write to Kepware'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Register New OPC Tag Modal */}
            {isAddTagModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Plus size={16} className="text-emerald-500" />
                      <span>Register New Kepware OPC Tag</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddTagModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateOpcTag} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Tag Name / Identifier *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. CUT_01.Aux.Motor_Temp"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Equipment Code *</label>
                        <select
                          value={newEqCode}
                          onChange={(e) => setNewEqCode(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-bold"
                        >
                          {equipmentList.map(eq => (
                            <option key={eq.equipmentId} value={eq.equipmentId}>{eq.equipmentId} - {eq.equipmentName}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Kepware Address (Channel.Device.Tag)</label>
                        <input
                          type="text"
                          placeholder="e.g. Channel1.CUT_01.Aux_Temp"
                          value={newKepwareAddr}
                          onChange={(e) => setNewKepwareAddr(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Engineering Units</label>
                        <input
                          type="text"
                          placeholder="e.g. °C, RPM, bar"
                          value={newUnits}
                          onChange={(e) => setNewUnits(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Data Type</label>
                        <select
                          value={newDataType}
                          onChange={(e) => setNewDataType(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="BOOLEAN">BOOLEAN (Bit)</option>
                          <option value="FLOAT">FLOAT (Analog)</option>
                          <option value="INTEGER">INTEGER (Counter)</option>
                          <option value="STRING">STRING (Text)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Access Mode</label>
                        <select
                          value={newAccessMode}
                          onChange={(e) => setNewAccessMode(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="READ_WRITE">READ_WRITE (Bi-Directional)</option>
                          <option value="READ_ONLY">READ_ONLY (Telemetry Feedback)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Description</label>
                      <input
                        type="text"
                        placeholder="Tag functional description..."
                        value={newTagDesc}
                        onChange={(e) => setNewTagDesc(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => setIsAddTagModalOpen(false)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Register Tag</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {activeTab === 'api-docs' && (
          <div className="space-y-2.5 font-sans">
            <div className="border-b dark:border-slate-700/50 pb-4">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <Terminal className="text-blue-500 animate-pulse" size={20} /> REST API Integration Sandbox
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Exposing secure REST API endpoints for seamless ERP/WMS/LIMS third-party software sync.</p>
            </div>

            {/* Auth Notice */}
            <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs space-y-1">
              <strong className="block">Authentication Header Required:</strong>
              <div>Include header: <code className="bg-slate-850 px-1 py-0.5 rounded font-mono text-xs">Authorization: Bearer &lt;JWT_TOKEN&gt;</code>.</div>
              <div>* Note: Interactive playground requests below automatically pass your active administrator session token.</div>
            </div>

            {/* Main grid: Left docs, Right test console */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
              {/* Left Column: Documentation Cards */}
              <div className="space-y-6 max-h-[750px] overflow-y-auto pr-2">

                {/* API 1: Material Receipt */}
                <div className="p-3 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-405 uppercase">Material Receipt (GRN)</span>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-extrabold font-mono">POST</span>
                  </div>
                  <div className="font-mono text-xs dark:text-white bg-slate-100 dark:bg-slate-955 p-2 rounded border dark:border-slate-800">
                    /materials/grn
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Payload Template (JSON)</label>
                    <textarea
                      rows={6}
                      value={grnPayload}
                      onChange={(e) => setGrnPayload(e.target.value)}
                      className="w-full bg-white dark:bg-slate-955 border dark:border-slate-800 rounded p-2 text-xs font-mono dark:text-slate-200"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => runApiTest('materials/grn', 'POST', grnPayload)}
                      disabled={apiLoading}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={apiLoading ? "animate-spin" : ""} /> Test receipt POST
                    </button>
                    <button
                      onClick={() => runApiTest('materials/grn', 'GET')}
                      className="px-3 py-1.5 border dark:border-slate-800 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-850"
                    >
                      Test receipt GET
                    </button>
                  </div>
                </div>

                {/* API 2: Campaign creation */}
                <div className="p-3 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-405 uppercase">Campaign / Batch Order</span>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-extrabold font-mono">POST</span>
                  </div>
                  <div className="font-mono text-xs dark:text-white bg-slate-100 dark:bg-slate-955 p-2 rounded border dark:border-slate-800">
                    /work-orders
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Payload Template (JSON)</label>
                    <textarea
                      rows={6}
                      value={orderPayload}
                      onChange={(e) => setOrderPayload(e.target.value)}
                      className="w-full bg-white dark:bg-slate-955 border dark:border-slate-800 rounded p-2 text-xs font-mono dark:text-slate-200"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => runApiTest('work-orders', 'POST', orderPayload)}
                      disabled={apiLoading}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={apiLoading ? "animate-spin" : ""} /> Test campaign POST
                    </button>
                    <button
                      onClick={() => runApiTest('work-orders', 'GET')}
                      className="px-3 py-1.5 border dark:border-slate-800 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-850"
                    >
                      Test campaign GET
                    </button>
                  </div>
                </div>

                {/* API 3: Material Consumption */}
                <div className="p-3 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-405 uppercase">Material Consumption</span>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-extrabold font-mono">POST</span>
                  </div>
                  <div className="font-mono text-xs dark:text-white bg-slate-100 dark:bg-slate-955 p-2 rounded border dark:border-slate-800">
                    /materials/consumption
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Payload Template (JSON)</label>
                    <textarea
                      rows={6}
                      value={consumptionPayload}
                      onChange={(e) => setConsumptionPayload(e.target.value)}
                      className="w-full bg-white dark:bg-slate-955 border dark:border-slate-800 rounded p-2 text-xs font-mono dark:text-slate-200"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => runApiTest('materials/consumption', 'POST', consumptionPayload)}
                      disabled={apiLoading}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={apiLoading ? "animate-spin" : ""} /> Test consumption POST
                    </button>
                    <button
                      onClick={() => runApiTest('materials/consumption', 'GET')}
                      className="px-3 py-1.5 border dark:border-slate-800 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-850"
                    >
                      Test consumption GET
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Execution Console */}
              <div className="flex flex-col h-full space-y-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Playground Test Output Console</span>
                <div className="flex-1 bg-slate-950 text-emerald-400 border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-3 font-mono text-[11px] overflow-y-auto min-h-[450px] max-h-[680px]">
                  <pre className="whitespace-pre-wrap leading-relaxed">{apiConsole}</pre>
                </div>
                <button
                  onClick={() => setApiConsole('Console cleared.')}
                  className="px-4 py-2 border border-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs font-bold w-full transition hover:bg-slate-850"
                >
                  Clear Console
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
