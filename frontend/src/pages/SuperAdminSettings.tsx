/**
 * @file SuperAdminSettings.tsx
 * @module Frontend/Pages/SuperAdminSettings
 * @description Master enterprise administration console designed according to the Recipes & BOM
 * layout paradigm. Features a full-viewport master-detail architecture consuming the entire screen,
 * top-level organization and plant summary metrics, a left-hand searchable organization list widget,
 * and right-hand collapsible accordion widgets for Manufacturing Plants, Plant Personnel Allocations
 * (deprecating the separate User Allocation tab), and an integrated Plant Brand Theme Studio.
 * 
 * @compliance GAMP 5 Category 4 Configured Enterprise System
 * @compliance ISO 9001:2015 Clause 7.1.3 (Infrastructure) & Clause 7.1.4 (Environment for Operation)
 * @compliance IATF 16949:2016 Clause 7.1.3.1 (Plant, Facility, and Equipment Planning)
 * @compliance 21 CFR Part 11 (§11.10(d) Authority checks & Role Allocations)
 * @compliance WCAG 2.1 AA Accessibility Standards (Color Contrast & Responsive DOM Layout)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useShopfloorStore } from '../context/shopfloorStore';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Factory,
  Palette,
  Users,
  Plus,
  Pencil,
  Save,
  Check,
  X,
  Sparkles,
  MapPin,
  Clock,
  Briefcase,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Globe,
  Radio,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ShieldCheck,
  ExternalLink,
  ChevronUp
} from 'lucide-react';
import { getApiUrl } from '../config';
import { PRESET_THEMES, PresetTheme, ThemeColors, applyThemeToDOM } from '../utils/themeEngine';

/**
 * @interface Organization
 * @description Represents a top-level corporate entity within the multi-tenant hierarchy.
 */
interface Organization {
  id: string;
  name: string;
  code: string;
  industryType: 'AUTOMOTIVE' | 'FOOD_BEVERAGE' | 'DISCRETE' | 'PHARMA';
  logoUrl?: string;
  isActive: boolean;
  plantCount?: number;
}

/**
 * @interface Plant
 * @description Represents a discrete manufacturing facility mapped to a parent organization.
 */
interface Plant {
  id: string;
  name: string;
  code: string;
  organizationId: string;
  organizationName?: string;
  location?: string;
  timezone?: string;
  status: string;
  themeName?: string;
}

/**
 * @interface UserItem
 * @description Represents an enterprise user account with organizational and plant allocations.
 */
interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  organizationName?: string;
  plantId?: string;
  plantName?: string;
}

/**
 * @component SuperAdminSettings
 * @description Executive management workbench for enterprise hierarchy, multi-plant provisioning,
 * site personnel allocations, and live CSS theme studio.
 */
export default function SuperAdminSettings() {
  const { user, token, setActivePalette } = useShopfloorStore();
  const navigate = useNavigate();

  // Core Data Collections
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Organization in Master-Detail Pane
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // Left Column Filtering & Search State
  const [orgFilter, setOrgFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [orgSearch, setOrgSearch] = useState('');

  // Right-side Collapsible Accordion States (Recipes Pattern)
  const [sections, setSections] = useState({
    plants: true,
    users: true,
    theme: false,
  });

  // Filter within Users Widget
  const [userPlantFilter, setUserPlantFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Partial<Organization> | null>(null);

  const [showPlantModal, setShowPlantModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Partial<Plant> | null>(null);

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Theme Studio State
  const [selectedThemePlantId, setSelectedThemePlantId] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ugam-navy');
  const [customColors, setCustomColors] = useState<ThemeColors>(PRESET_THEMES[0].colors);
  const [themeSaving, setThemeSaving] = useState(false);

  // =========================================================================
  // SECTION 1: ROLE GUARD & NOTIFICATION DISPATCH
  // =========================================================================

  // Enforce SUPER_ADMIN and ADMIN Role Authorization
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  /**
   * @function showToast
   * @description Displays a temporary auto-dismissing toast notification on the dashboard HUD.
   */
  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  // =========================================================================
  // SECTION 2: DATA FETCHING & HYDRATION
  // =========================================================================

  /**
   * @function fetchData
   * @description Concurrently loads organizations, plants, and users from the enterprise API.
   */
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [orgsRes, plantsRes, usersRes] = await Promise.all([
        fetch(getApiUrl('/enterprise/organizations'), { headers }),
        fetch(getApiUrl('/enterprise/plants'), { headers }),
        fetch(getApiUrl('/enterprise/users'), { headers }),
      ]);

      let orgsList: Organization[] = [];
      let plantsList: Plant[] = [];

      if (orgsRes.ok) {
        orgsList = await orgsRes.json();
        setOrganizations(orgsList);
      }
      if (plantsRes.ok) {
        plantsList = await plantsRes.json();
        setPlants(plantsList);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      // Initialize selected organization
      if (orgsList.length > 0) {
        setSelectedOrgId((current) => {
          if (current && orgsList.some((o) => o.id === current)) return current;
          return orgsList[0].id;
        });
      }

      // Initialize default plant for theme studio
      if (plantsList.length > 0 && !selectedThemePlantId) {
        setSelectedThemePlantId(plantsList[0].id);
      }
    } catch (err) {
      console.error('Error loading enterprise data', err);
      showToast('Error connecting to enterprise API', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Load theme configuration when selectedThemePlantId changes
  useEffect(() => {
    if (!selectedThemePlantId || !token) return;
    const fetchTheme = async () => {
      try {
        const res = await fetch(getApiUrl(`/enterprise/themes/${selectedThemePlantId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const themeData = await res.json();
          if (themeData && themeData.colors) {
            setCustomColors(themeData.colors);
            const matchedPreset = PRESET_THEMES.find((p) => p.name === themeData.themeName);
            if (matchedPreset) setSelectedPresetId(matchedPreset.id);
            else setSelectedPresetId('custom');
          }
        }
      } catch (err) {
        console.error('Failed to load theme for plant', err);
      }
    };
    fetchTheme();
  }, [selectedThemePlantId, token]);

  // =========================================================================
  // SECTION 3: COMPUTED PROPERTIES & SELECTORS
  // =========================================================================

  // Organization count statistics
  const activeOrgCount = useMemo(() => organizations.filter((o) => o.isActive).length, [organizations]);
  const inactiveOrgCount = useMemo(() => organizations.filter((o) => !o.isActive).length, [organizations]);

  // Filtered organizations list for the left column
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchesFilter =
        orgFilter === 'ALL' ||
        (orgFilter === 'ACTIVE' && org.isActive) ||
        (orgFilter === 'INACTIVE' && !org.isActive);

      const matchesSearch =
        orgSearch.trim() === '' ||
        org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
        org.code.toLowerCase().includes(orgSearch.toLowerCase()) ||
        org.industryType.toLowerCase().includes(orgSearch.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [organizations, orgFilter, orgSearch]);

  // Current selected organization
  const selectedOrg = useMemo(() => {
    if (organizations.length === 0) return null;
    return organizations.find((o) => o.id === selectedOrgId) || organizations[0];
  }, [organizations, selectedOrgId]);

  // Manufacturing plants mapped to the selected organization
  const selectedOrgPlants = useMemo(() => {
    if (!selectedOrg) return [];
    return plants.filter((p) => p.organizationId === selectedOrg.id);
  }, [plants, selectedOrg]);

  // Enterprise users mapped to the selected organization or its plants
  const selectedOrgUsers = useMemo(() => {
    if (!selectedOrg) return [];
    const orgPlantIds = new Set(selectedOrgPlants.map((p) => p.id));
    return users.filter((u) => u.organizationId === selectedOrg.id || (u.plantId && orgPlantIds.has(u.plantId)));
  }, [users, selectedOrg, selectedOrgPlants]);

  // Filtered users for Widget 2 based on plant tabs and search
  const displayedUsers = useMemo(() => {
    return selectedOrgUsers.filter((u) => {
      const matchesPlant = userPlantFilter === 'ALL' || u.plantId === userPlantFilter;
      const term = userSearch.toLowerCase().trim();
      const matchesSearch =
        !term ||
        u.username.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term) ||
        (u.firstName && u.firstName.toLowerCase().includes(term)) ||
        (u.lastName && u.lastName.toLowerCase().includes(term));
      return matchesPlant && matchesSearch;
    });
  }, [selectedOrgUsers, userPlantFilter, userSearch]);

  // Accordion section toggles
  const toggleSection = (section: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAllSections = (open: boolean) => {
    setSections({ plants: open, users: open, theme: open });
  };

  // Helper for industry styling badges
  const getIndustryBadge = (industry: string) => {
    switch (industry) {
      case 'AUTOMOTIVE':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25';
      case 'FOOD_BEVERAGE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25';
      case 'PHARMA':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25';
    }
  };

  // Helper for role styling badges
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30';
      case 'ADMIN':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30';
      case 'PRODUCTION_MANAGER':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30';
      case 'QUALITY_ENGINEER':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      case 'OPERATOR':
        return 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30';
    }
  };

  // =========================================================================
  // SECTION 4: ACTIONS & FORM HANDLERS
  // =========================================================================

  /**
   * @function handleSaveOrg
   * @description Submits a new or updated organization payload.
   */
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg?.name || !editingOrg?.code) {
      showToast('Name and Code are required', true);
      return;
    }

    try {
      const isEdit = Boolean(editingOrg.id);
      const url = isEdit
        ? getApiUrl(`/enterprise/organizations/${editingOrg.id}`)
        : getApiUrl('/enterprise/organizations');
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingOrg),
      });

      if (res.ok) {
        showToast(`Organization ${isEdit ? 'updated' : 'created'} successfully!`);
        setShowOrgModal(false);
        setEditingOrg(null);
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.message || 'Operation failed', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', true);
    }
  };

  /**
   * @function handleSavePlant
   * @description Submits a new or updated manufacturing plant payload.
   */
  const handleSavePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlant?.name || !editingPlant?.code || !editingPlant?.organizationId) {
      showToast('Name, Code and Parent Organization are required', true);
      return;
    }

    try {
      const isEdit = Boolean(editingPlant.id);
      const url = isEdit
        ? getApiUrl(`/enterprise/plants/${editingPlant.id}`)
        : getApiUrl('/enterprise/plants');
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingPlant),
      });

      if (res.ok) {
        showToast(`Plant ${isEdit ? 'updated' : 'created'} successfully!`);
        setShowPlantModal(false);
        setEditingPlant(null);
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.message || 'Operation failed', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', true);
    }
  };

  /**
   * @function handleSaveUserAllocation
   * @description Updates user plant site or role allocation.
   */
  const handleSaveUserAllocation = async () => {
    if (!editingUser || !token) return;
    try {
      const res = await fetch(getApiUrl(`/enterprise/users/${editingUser.id}/allocation`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: editingUser.organizationId || null,
          plantId: editingUser.plantId || null,
          role: editingUser.role,
        }),
      });

      if (res.ok) {
        showToast(`User ${editingUser.username} allocations updated!`);
        setEditingUser(null);
        await fetchData();
      } else {
        showToast('Failed to update user allocation', true);
      }
    } catch (err) {
      showToast('Error updating user allocation', true);
    }
  };

  /**
   * @function handleSelectPreset
   * @description Previews a preset color scheme instantly on the DOM.
   */
  const handleSelectPreset = (preset: PresetTheme) => {
    setSelectedPresetId(preset.id);
    setCustomColors(preset.colors);
    applyThemeToDOM(preset.colors);
  };

  /**
   * @function handlePublishTheme
   * @description Persists custom color palette as the default for the target plant.
   */
  const handlePublishTheme = async () => {
    if (!selectedThemePlantId || !token) return;
    setThemeSaving(true);
    try {
      const targetPlant = plants.find((p) => p.id === selectedThemePlantId);
      const preset = PRESET_THEMES.find((p) => p.id === selectedPresetId);
      const themeName = preset ? preset.name : `${targetPlant?.name || 'Plant'} Custom Theme`;

      const res = await fetch(getApiUrl(`/enterprise/themes/${selectedThemePlantId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          themeName,
          colors: customColors,
        }),
      });

      if (res.ok) {
        showToast(`Theme "${themeName}" published as plant default!`);
        setActivePalette(customColors);
        await fetchData();
      } else {
        showToast('Failed to save plant theme', true);
      }
    } catch (err) {
      showToast('Network error while saving theme', true);
    } finally {
      setThemeSaving(false);
    }
  };

  // =========================================================================
  // SECTION 5: RENDER UI
  // =========================================================================

  return (
    <div className="space-y-2.5 font-sans p-2 sm:p-3 md:p-4 w-full h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <AlertCircle size={16} />
          {errorMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER: TITLE, BADGES, SUMMARY CARDS & ACTIONS (RECIPES PARADIGM)      */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1F3A5C] pb-2.5 flex-shrink-0 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={20} className="text-blue-500 shrink-0" />
              <span>Organizations & Plant Infrastructure</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 shrink-0">
              Multi-Tenant
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 shrink-0">
              👑 {user?.role || 'SUPER_ADMIN'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate hidden sm:block">
            Configure enterprise multi-tenancy, manage manufacturing facilities, orchestrate plant CSS themes, and assign user site allocations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          {/* Top KPI Summary Metric Cards */}
          <div className="bg-slate-100 dark:bg-[#102237] p-1 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex items-center gap-1 shadow-inner shrink-0">
            {/* Organizations Counter Card */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-[#174A7C] text-[#174A7C] dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-[#F5A623]/40 border border-slate-200/80 dark:border-transparent whitespace-nowrap">
              <Building2 size={13} className="text-blue-500 dark:text-[#F5A623] shrink-0" />
              <span>Organizations</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:bg-white/20 dark:text-white">
                {organizations.length}
              </span>
            </div>

            {/* Plants Counter Card */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
              <Factory size={13} className="text-emerald-500 shrink-0" />
              <span>Plants</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                {plants.length}
              </span>
            </div>

            {/* Users Counter Card */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
              <Users size={13} className="text-purple-500 shrink-0" />
              <span>Users</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                {users.length}
              </span>
            </div>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={fetchData}
            title="Refresh Enterprise Topology"
            className="h-8.5 w-8.5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-[#1F3A5C] rounded-lg bg-white dark:bg-[#102237] transition shrink-0 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Primary '+ Create New Organization' Action Button */}
          <button
            onClick={() => {
              setEditingOrg({
                name: '',
                code: '',
                industryType: 'AUTOMOTIVE',
                isActive: true,
              });
              setShowOrgModal(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold h-8.5 px-3 rounded-lg text-xs transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={15} className="shrink-0" />
            <span>Create New Organization</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN MASTER-DETAIL WORKBENCH (FULL-HEIGHT 3-COLUMN GRID)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: ORGANIZATIONS LIST WIDGET (1/3 WIDTH)                      */}
        {/* ======================================================================= */}
        <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm rounded-xl p-3.5 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#1F3A5C] flex-shrink-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={16} className="text-blue-500" /> Organizations
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#102237] text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-[#1F3A5C]">
              {filteredOrgs.length} Listed
            </span>
          </div>

          {/* Segmented Button Filter Cards: Active / Inactive / All */}
          <div className="bg-slate-100 dark:bg-[#102237] p-1 rounded-xl border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 flex items-center gap-1 shadow-inner text-[11px] font-bold flex-shrink-0 my-2">
            <button
              onClick={() => setOrgFilter('ACTIVE')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                orgFilter === 'ACTIVE' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-emerald-500/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
              }`}
            >
              <span>Active</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                orgFilter === 'ACTIVE'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
              }`}>
                {activeOrgCount}
              </span>
            </button>
            <button
              onClick={() => setOrgFilter('INACTIVE')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                orgFilter === 'INACTIVE' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-amber-500/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
              }`}
            >
              <span>Inactive</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                orgFilter === 'INACTIVE'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
              }`}>
                {inactiveOrgCount}
              </span>
            </button>
            <button
              onClick={() => setOrgFilter('ALL')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all duration-150 text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                orgFilter === 'ALL' ? 'bg-[#174A7C] text-white font-bold shadow-sm ring-2 ring-[#174A7C]/25 dark:ring-[#F5A623]/30 border border-[#174A7C]' : 'bg-white dark:bg-[#142A45] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1F3A5C] shadow-xs hover:border-[#174A7C] hover:text-[#174A7C]'
              }`}
            >
              <span>All</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                orgFilter === 'ALL'
                  ? 'bg-blue-100 dark:bg-[#102237] text-blue-700 dark:text-[#F5A623]'
                  : 'bg-slate-200/70 dark:bg-[#142A45] text-slate-500 dark:text-slate-400'
              }`}>
                {organizations.length}
              </span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative mb-2 flex-shrink-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              placeholder="Search by code, name, industry..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Organizations Scrollable Card List */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2 flex-1">
              <RefreshCw size={18} className="animate-spin text-blue-500" />
              Loading corporate organizations...
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-[#1F3A5C] rounded-lg flex-1 flex items-center justify-center">
              No organizations found matching filter.
            </div>
          ) : (
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1.5 mes-scrollbar">
              {filteredOrgs.map((org) => {
                const isSelected = selectedOrg?.id === org.id;
                const orgPlants = plants.filter((p) => p.organizationId === org.id);

                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrgId(org.id);
                      setUserPlantFilter('ALL');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-[#102237] border-blue-500 shadow-sm ring-1 ring-blue-500/50'
                        : 'border-slate-200 dark:border-[#1F3A5C]/60 hover:bg-slate-50 dark:hover:bg-[#102237]/40'
                    }`}
                  >
                    {/* Organization Icon / Logo Avatar */}
                    <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={20} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {org.code}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                          org.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                            : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-400/25'
                        }`}>
                          {org.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {org.name}
                      </h4>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${getIndustryBadge(org.industryType)}`}>
                          {org.industryType}
                        </span>
                        <span className="font-semibold px-1.5 py-0.5 bg-slate-100 dark:bg-[#102237] rounded text-[9px] border border-slate-200 dark:border-[#1F3A5C]">
                          {orgPlants.length} Plants
                        </span>
                      </div>
                    </div>

                    {/* Small arrow indicator for selected item */}
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

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: DETAIL WORKBENCH WITH COLLAPSIBLE WIDGETS (2/3 WIDTH)     */}
        {/* ======================================================================= */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          {selectedOrg ? (
            <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 shadow-sm rounded-xl p-4 flex flex-col h-full overflow-hidden">
              {/* Organization Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F3A5C] gap-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {selectedOrg.logoUrl ? (
                      <img src={selectedOrg.logoUrl} alt={selectedOrg.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={24} className="text-blue-500" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {selectedOrg.code}
                      </span>
                      <h2 className="text-sm font-bold dark:text-white text-slate-900 truncate max-w-[320px]">
                        {selectedOrg.name}
                      </h2>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getIndustryBadge(selectedOrg.industryType)}`}>
                        {selectedOrg.industryType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Corporate Tenant UUID: <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedOrg.id}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                  {/* Status & Counts Card */}
                  <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#102237] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#1F3A5C]">
                    <div className="text-left md:text-right">
                      <span className="text-[8px] block font-bold text-slate-400 uppercase tracking-wider">Plants</span>
                      <span className="text-xs font-bold text-blue-500">{selectedOrgPlants.length}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-[#1F3A5C]" />
                    <div className="text-left md:text-right">
                      <span className="text-[8px] block font-bold text-slate-400 uppercase tracking-wider">Allocated Users</span>
                      <span className="text-xs font-bold text-purple-500">{selectedOrgUsers.length}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-[#1F3A5C]" />
                    <div className="text-left md:text-right">
                      <span className="text-[8px] block font-bold text-slate-400 uppercase tracking-wider">Status</span>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${
                        selectedOrg.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                          : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-400/25'
                      }`}>
                        {selectedOrg.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>

                  {/* Edit Organization Button */}
                  <button
                    onClick={() => {
                      setEditingOrg(selectedOrg);
                      setShowOrgModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#102237] dark:hover:bg-[#1F3A5C] text-slate-700 dark:text-slate-200 font-bold py-1.5 px-3 rounded text-xs transition border border-slate-200 dark:border-[#1F3A5C] cursor-pointer"
                    title="Edit organization profile"
                  >
                    <Pencil size={13} /> Edit Org
                  </button>

                  {/* Primary '+ Add New Plant' Action Button */}
                  <button
                    onClick={() => {
                      setEditingPlant({
                        name: '',
                        code: '',
                        organizationId: selectedOrg.id,
                        location: '',
                        timezone: 'Asia/Kolkata',
                        status: 'ACTIVE',
                      });
                      setShowPlantModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-1.5 px-3 rounded text-xs transition shadow-sm cursor-pointer"
                    title="Add a manufacturing plant to this organization"
                  >
                    <Plus size={13} className="text-white" /> Add New Plant
                  </button>
                </div>
              </div>

              {/* Section Controls Toolbar */}
              <div className="flex justify-between items-center py-2 text-[11px] text-slate-400 flex-shrink-0">
                <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs">
                  Enterprise Topology & Site Allocations
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleAllSections(true)}
                    className="hover:text-blue-500 text-slate-400 transition cursor-pointer font-medium"
                  >
                    Expand All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => toggleAllSections(false)}
                    className="hover:text-blue-500 text-slate-400 transition cursor-pointer font-medium"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Scrollable Accordions Container (Consumes Rest of Screen) */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 mes-scrollbar">
                {/* =================================================================== */}
                {/* ACCORDION 1: MANUFACTURING PLANTS & SITES                           */}
                {/* =================================================================== */}
                <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                  <button
                    type="button"
                    onClick={() => toggleSection('plants')}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Factory size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Manufacturing Plants & Facilities
                          </h4>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                            {selectedOrgPlants.length} Plants
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Registered manufacturing sites mapped to {selectedOrg.name}</p>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                        sections.plants ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>

                  {sections.plants && (
                    <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                      {selectedOrgPlants.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-[#102237] rounded-lg border border-dashed border-slate-200 dark:border-[#1F3A5C] mt-2.5 flex flex-col items-center justify-center gap-2">
                          <Factory size={22} className="text-slate-400" />
                          <p>No manufacturing plants registered for {selectedOrg.name}.</p>
                          <button
                            onClick={() => {
                              setEditingPlant({
                                name: '',
                                code: '',
                                organizationId: selectedOrg.id,
                                location: '',
                                timezone: 'Asia/Kolkata',
                                status: 'ACTIVE',
                              });
                              setShowPlantModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer mt-1"
                          >
                            <Plus size={13} /> Provision First Plant
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto mt-2.5">
                          <table className="w-full text-left text-xs border border-slate-200 dark:border-[#1F3A5C] rounded-lg overflow-hidden bg-white dark:bg-[#102237]">
                            <thead className="bg-slate-100 dark:bg-[#0c1a2b] text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-[#1F3A5C]">
                              <tr>
                                <th className="p-2.5">Plant Code & Name</th>
                                <th className="p-2.5">Location & Timezone</th>
                                <th className="p-2.5 text-center">Status</th>
                                <th className="p-2.5 text-center">Allocated Users</th>
                                <th className="p-2.5">Branding Theme</th>
                                <th className="p-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1F3A5C]/60">
                              {selectedOrgPlants.map((plant) => {
                                const plantUsers = users.filter((u) => u.plantId === plant.id);
                                return (
                                  <tr key={plant.id} className="hover:bg-slate-50 dark:hover:bg-[#142A45]/50 transition">
                                    <td className="p-2.5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                                          <Factory size={14} />
                                        </div>
                                        <div>
                                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs block">
                                            {plant.code}
                                          </span>
                                          <span className="font-bold text-slate-900 dark:text-white">
                                            {plant.name}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-slate-600 dark:text-slate-300">
                                      <div className="flex items-center gap-1.5 text-[11px]">
                                        <MapPin size={12} className="text-slate-400" />
                                        <span>{plant.location || 'Site location not set'}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                        <Clock size={11} />
                                        <span>{plant.timezone || 'UTC'}</span>
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        plant.status === 'ACTIVE'
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                                      }`}>
                                        {plant.status}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <button
                                        onClick={() => {
                                          setUserPlantFilter(plant.id);
                                          setSections((prev) => ({ ...prev, users: true }));
                                        }}
                                        className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25 hover:bg-purple-500/20 transition cursor-pointer"
                                        title="Click to filter users below for this plant"
                                      >
                                        {plantUsers.length} Users
                                      </button>
                                    </td>
                                    <td className="p-2.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                          {plant.themeName || 'Ugam Corporate Navy'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => {
                                            setSelectedThemePlantId(plant.id);
                                            setSections((prev) => ({ ...prev, theme: true }));
                                          }}
                                          title="Customize theme for this plant"
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-[#142A45] transition cursor-pointer"
                                        >
                                          <Palette size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingPlant(plant);
                                            setShowPlantModal(true);
                                          }}
                                          title="Edit plant facility details"
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#142A45] transition cursor-pointer"
                                        >
                                          <Pencil size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* =================================================================== */}
                {/* ACCORDION 2: PLANT USERS & ACCESS ALLOCATIONS                       */}
                {/* (REPLACES THE SEPARATE USER ALLOCATION TAB)                         */}
                {/* =================================================================== */}
                <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                  <button
                    type="button"
                    onClick={() => toggleSection('users')}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Users size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Plant Personnel & User Allocations
                          </h4>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                            {displayedUsers.length} Users
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Role authorizations and site assignments for {selectedOrg.name} (Integrated allocation control)
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                        sections.users ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>

                  {sections.users && (
                    <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60">
                      {/* Filter Bar: Plant Switcher & Search */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 my-2.5">
                        {/* Plant Segmented Tabs */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#102237] p-1 rounded-lg border border-slate-200 dark:border-[#1F3A5C]">
                          <button
                            onClick={() => setUserPlantFilter('ALL')}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                              userPlantFilter === 'ALL'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            All Plants in {selectedOrg.code} ({selectedOrgUsers.length})
                          </button>
                          {selectedOrgPlants.map((plant) => {
                            const count = users.filter((u) => u.plantId === plant.id).length;
                            return (
                              <button
                                key={plant.id}
                                onClick={() => setUserPlantFilter(plant.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                  userPlantFilter === plant.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                <span>{plant.name}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                  userPlantFilter === plant.id ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-[#142A45]'
                                }`}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Search in Users */}
                        <div className="relative sm:w-64">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Filter users by name or role..."
                            className="w-full pl-8 pr-3 py-1 bg-white dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* User Accounts Table */}
                      {displayedUsers.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-[#102237] rounded-lg border border-dashed border-slate-200 dark:border-[#1F3A5C]">
                          No personnel allocated to this selection.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border border-slate-200 dark:border-[#1F3A5C] rounded-lg overflow-hidden bg-white dark:bg-[#102237]">
                            <thead className="bg-slate-100 dark:bg-[#0c1a2b] text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-[#1F3A5C]">
                              <tr>
                                <th className="p-2.5">User Handle & Name</th>
                                <th className="p-2.5">Email Address</th>
                                <th className="p-2.5 text-center">System Role</th>
                                <th className="p-2.5">Assigned Plant Site</th>
                                <th className="p-2.5 text-right">Site Allocation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1F3A5C]/60">
                              {displayedUsers.map((u) => {
                                const userPlant = plants.find((p) => p.id === u.plantId);
                                const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;
                                return (
                                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-[#142A45]/50 transition">
                                    <td className="p-2.5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs uppercase">
                                          {u.username.substring(0, 2)}
                                        </div>
                                        <div>
                                          <span className="font-bold text-slate-900 dark:text-white block">
                                            {fullName}
                                          </span>
                                          <span className="font-mono text-[10px] text-slate-400">
                                            @{u.username}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                      {u.email}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(u.role)}`}>
                                        {u.role}
                                      </span>
                                    </td>
                                    <td className="p-2.5">
                                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                        <MapPin size={12} className="text-emerald-500 flex-shrink-0" />
                                        <span>{userPlant?.name || u.plantName || 'Not Allocated'}</span>
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-right">
                                      <button
                                        onClick={() => setEditingUser(u)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs transition border border-blue-500/20 cursor-pointer"
                                        title="Reallocate user to a different plant or change system role"
                                      >
                                        <Briefcase size={12} />
                                        <span>Reallocate</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* =================================================================== */}
                {/* ACCORDION 3: PLANT BRAND & LIVE CSS THEME STUDIO                    */}
                {/* =================================================================== */}
                <div className="border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#102237]/40 transition">
                  <button
                    type="button"
                    onClick={() => toggleSection('theme')}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/70 dark:hover:bg-[#102237]/80 transition cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Palette size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Plant Brand & Theme Studio
                          </h4>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                            {selectedPresetId}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Live CSS custom property injection and palette presets for manufacturing sites</p>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                        sections.theme ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>

                  {sections.theme && (
                    <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-[#1F3A5C]/60 space-y-3 mt-2.5">
                      {/* Target Plant Selector */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white dark:bg-[#102237] p-2.5 rounded-lg border border-slate-200 dark:border-[#1F3A5C]">
                        <div className="flex items-center gap-2">
                          <Factory size={15} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Customization Target:</span>
                          <select
                            value={selectedThemePlantId}
                            onChange={(e) => setSelectedThemePlantId(e.target.value)}
                            className="bg-slate-50 dark:bg-[#142A45] border border-slate-200 dark:border-[#1F3A5C] text-xs rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {selectedOrgPlants.map((plant) => (
                              <option key={plant.id} value={plant.id}>
                                {plant.name} ({plant.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={handlePublishTheme}
                          disabled={themeSaving || !selectedThemePlantId}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <Save size={13} />
                          {themeSaving ? 'Saving Theme...' : 'Publish Theme to Plant'}
                        </button>
                      </div>

                      {/* Theme Presets */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                          Industrial Theme Presets (Live Preview on Click):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                          {PRESET_THEMES.map((preset) => {
                            const isSelected = selectedPresetId === preset.id;
                            return (
                              <button
                                key={preset.id}
                                onClick={() => handleSelectPreset(preset)}
                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-[#142A45] ring-2 ring-blue-500/30'
                                    : 'border-slate-200 dark:border-[#1F3A5C] bg-white dark:bg-[#102237] hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {preset.name}
                                  </span>
                                  {isSelected && <Check size={14} className="text-blue-500" />}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {preset.previewColors.map((color, idx) => (
                                    <div
                                      key={idx}
                                      className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Color Palette Tokens Preview */}
                      <div className="bg-white dark:bg-[#102237] p-3 rounded-lg border border-slate-200 dark:border-[#1F3A5C]">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
                          Fine-Tune Brand Color Tokens:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              Brand Primary
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={customColors.colorPrimary || '#1E40AF'}
                                onChange={(e) => {
                                  const updated = { ...customColors, colorPrimary: e.target.value };
                                  setCustomColors(updated);
                                  setSelectedPresetId('custom');
                                  applyThemeToDOM(updated);
                                }}
                                className="w-7 h-7 rounded border-0 cursor-pointer p-0"
                              />
                              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {customColors.colorPrimary}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              Action Accent
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={customColors.colorAccent || '#3B82F6'}
                                onChange={(e) => {
                                  const updated = { ...customColors, colorAccent: e.target.value };
                                  setCustomColors(updated);
                                  setSelectedPresetId('custom');
                                  applyThemeToDOM(updated);
                                }}
                                className="w-7 h-7 rounded border-0 cursor-pointer p-0"
                              />
                              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {customColors.colorAccent}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              Corporate Canvas
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={customColors.colorCorporate || '#0F172A'}
                                onChange={(e) => {
                                  const updated = { ...customColors, colorCorporate: e.target.value };
                                  setCustomColors(updated);
                                  setSelectedPresetId('custom');
                                  applyThemeToDOM(updated);
                                }}
                                className="w-7 h-7 rounded border-0 cursor-pointer p-0"
                              />
                              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {customColors.colorCorporate}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              Running Status
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={customColors.colorRunning || '#10B981'}
                                onChange={(e) => {
                                  const updated = { ...customColors, colorRunning: e.target.value };
                                  setCustomColors(updated);
                                  setSelectedPresetId('custom');
                                  applyThemeToDOM(updated);
                                }}
                                className="w-7 h-7 rounded border-0 cursor-pointer p-0"
                              />
                              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {customColors.colorRunning || '#10B981'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#142A45] border-2 border-[#174A7C]/25 dark:border-[#174A7C]/35 rounded-xl p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
              <Building2 size={36} className="text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Organization Selected</p>
              <p className="text-xs text-slate-400 mt-1">Select an organization from the left panel or create a new corporate entity.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT ORGANIZATION                                       */}
      {/* ========================================================================= */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#142A45] border border-slate-200 dark:border-[#1F3A5C] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-[#1F3A5C]">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingOrg?.id ? 'Edit Organization' : 'Create New Organization'}
                </h3>
              </div>
              <button
                onClick={() => setShowOrgModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrg} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingOrg?.name || ''}
                  onChange={(e) => setEditingOrg((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Precision Automotive Group"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Organization Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingOrg?.code || ''}
                    onChange={(e) => setEditingOrg((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. UGAM-AUTO"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Industry Type *
                  </label>
                  <select
                    value={editingOrg?.industryType || 'AUTOMOTIVE'}
                    onChange={(e) => setEditingOrg((prev) => ({ ...prev, industryType: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AUTOMOTIVE">Automotive & Electronics</option>
                    <option value="FOOD_BEVERAGE">Food & Beverage</option>
                    <option value="DISCRETE">Discrete Manufacturing</option>
                    <option value="PHARMA">Pharmaceutical & Medical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Logo Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={editingOrg?.logoUrl || ''}
                  onChange={(e) => setEditingOrg((prev) => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://... or /uploads/logo.png"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="orgActiveSwitch"
                  checked={editingOrg?.isActive ?? true}
                  onChange={(e) => setEditingOrg((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="orgActiveSwitch" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Active Corporate Entity
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#1F3A5C]">
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
                >
                  <Save size={14} /> Save Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT MANUFACTURING PLANT                                */}
      {/* ========================================================================= */}
      {showPlantModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#142A45] border border-slate-200 dark:border-[#1F3A5C] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-[#1F3A5C]">
              <div className="flex items-center gap-2">
                <Factory size={20} className="text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingPlant?.id ? 'Edit Plant Facility' : 'Provision New Manufacturing Plant'}
                </h3>
              </div>
              <button
                onClick={() => setShowPlantModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlant} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Parent Organization *
                </label>
                <select
                  required
                  value={editingPlant?.organizationId || selectedOrg?.id || ''}
                  onChange={(e) => setEditingPlant((prev) => ({ ...prev, organizationId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Plant Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingPlant?.name || ''}
                  onChange={(e) => setEditingPlant((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Pune Precision Automotive Facility"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Plant Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlant?.code || ''}
                    onChange={(e) => setEditingPlant((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. AUTO-PLANT-01"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Operational Status
                  </label>
                  <select
                    value={editingPlant?.status || 'ACTIVE'}
                    onChange={(e) => setEditingPlant((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Geographic Location
                  </label>
                  <input
                    type="text"
                    value={editingPlant?.location || ''}
                    onChange={(e) => setEditingPlant((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Pune, MH, India"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={editingPlant?.timezone || 'Asia/Kolkata'}
                    onChange={(e) => setEditingPlant((prev) => ({ ...prev, timezone: e.target.value }))}
                    placeholder="e.g. Asia/Kolkata"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#1F3A5C]">
                <button
                  type="button"
                  onClick={() => setShowPlantModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
                >
                  <Save size={14} /> Save Plant Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REALLOCATE USER TO PLANT SITE / CHANGE ROLE                      */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#142A45] border border-slate-200 dark:border-[#1F3A5C] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-[#1F3A5C]">
              <div className="flex items-center gap-2">
                <Briefcase size={20} className="text-purple-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reallocate User Site & Permissions
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#102237] p-3 rounded-xl border border-slate-200 dark:border-[#1F3A5C] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm uppercase">
                  {editingUser.username.substring(0, 2)}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    {[editingUser.firstName, editingUser.lastName].filter(Boolean).join(' ') || editingUser.username}
                  </h4>
                  <p className="font-mono text-[11px] text-slate-400">@{editingUser.username} • {editingUser.email}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assign to Corporate Organization
                </label>
                <select
                  value={editingUser.organizationId || selectedOrg?.id || ''}
                  onChange={(e) => {
                    const newOrgId = e.target.value;
                    const orgPlants = plants.filter((p) => p.organizationId === newOrgId);
                    setEditingUser((prev) =>
                      prev
                        ? {
                            ...prev,
                            organizationId: newOrgId,
                            plantId: orgPlants.length > 0 ? orgPlants[0].id : undefined,
                          }
                        : null
                    );
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assign to Manufacturing Plant Facility *
                </label>
                <select
                  value={editingUser.plantId || ''}
                  onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, plantId: e.target.value } : null))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Plant Allocated (Global) --</option>
                  {plants
                    .filter((p) => !editingUser.organizationId || p.organizationId === editingUser.organizationId)
                    .map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.name} ({plant.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  System Role Authorization *
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, role: e.target.value } : null))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#102237] border border-slate-200 dark:border-[#1F3A5C] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OPERATOR">OPERATOR - Shopfloor Line Terminal Execution</option>
                  <option value="SUPERVISOR">SUPERVISOR - Shift & Work Center Supervision</option>
                  <option value="PRODUCTION_MANAGER">PRODUCTION_MANAGER - Work Orders & Scheduling</option>
                  <option value="QUALITY_ENGINEER">QUALITY_ENGINEER - Deviations, eBR & Signatures</option>
                  <option value="ADMIN">ADMIN - Plant Asset & Master Administration</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN - Enterprise Multi-Tenant Governance</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#1F3A5C]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserAllocation}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
                >
                  <Save size={14} /> Commit Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
