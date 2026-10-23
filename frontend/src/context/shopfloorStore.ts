/**
 * @file shopfloorStore.ts
 * @module Frontend/Context/ShopfloorStore
 * @description Central reactive Zustand state store for operator workstations, machine telemetry,
 * active plant theme palettes, real-time shopfloor alerts, and multi-tenant session management.
 * Synchronizes authentication tokens and custom color variables with browser LocalStorage and DOM roots.
 * 
 * @compliance FDA 21 CFR Part 11 (§11.10 Controls for Closed Systems)
 * @compliance GAMP 5 Category 4 Configured Software Application State
 * @compliance ISO 22400 (Real-time OEE, Good, and Scrap Telemetry)
 */

import { create } from 'zustand';
import { ThemeColors, applyThemeToDOM } from '../utils/themeEngine';

/**
 * @interface User
 * @description Active authenticated session identity and plant allocation profile.
 * 
 * @property {string} id - Unique User UUID
 * @property {string} username - User login handle
 * @property {string} role - System RBAC role
 * @property {string} name - Full user name
 * @property {string} [organizationId] - Parent organization UUID
 * @property {string} [organizationName] - Corporate parent name
 * @property {string} [plantId] - Currently assigned manufacturing facility UUID
 * @property {string} [plantName] - Facility name
 * @property {object} [theme] - Site-specific color palette applied upon login
 */
export interface User {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'PRODUCTION_MANAGER' | 'SUPERVISOR' | 'OPERATOR' | 'QUALITY_ENGINEER';
  name: string;
  organizationId?: string;
  organizationName?: string;
  plantId?: string;
  plantName?: string;
  theme?: {
    themeName: string;
    colors: ThemeColors;
  };
}

/**
 * @interface AlertNotification
 * @description Push notification model for process excursions, maintenance warnings, and calibration alerts.
 * 
 * @property {string} id - Unique alert notification identifier
 * @property {string} title - Brief headline describing the alert condition
 * @property {string} message - Detailed notification body
 * @property {string} severity - Severity level: INFO, WARNING, or CRITICAL
 * @property {Date} timestamp - Time at which alert was generated
 * @property {boolean} isRead - Flag indicating if alert has been acknowledged by user
 * @property {string} [link] - Deep link URL to target entity
 */
export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: Date;
  isRead: boolean;
  link?: string;
}

/**
 * @interface ShopfloorState
 * @description Master state schema and action signatures for the shopfloor store.
 */
interface ShopfloorState {
  token: string | null;
  user: User | null;
  theme: 'light' | 'dark';
  activePalette: ThemeColors | null;
  mode: 'standard' | 'factory';
  alerts: AlertNotification[];
  
  // SMT Live Simulation Metrics
  liveMachineStatuses: Record<string, 'RUNNING' | 'IDLE' | 'BREAKDOWN' | 'SETUP' | 'MAINTENANCE'>;
  liveMachineOEE: Record<string, number>;
  liveGoodCounts: Record<string, number>;
  liveScrapCounts: Record<string, number>;

  // Actions
  login: (token: string, user: User) => void;
  logout: () => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setActivePalette: (palette: ThemeColors) => void;
  toggleMode: () => void;
  addAlert: (alert: Omit<AlertNotification, 'id' | 'isRead'>) => void;
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;
  clearAllAlerts: () => void;
  updateLiveMachineState: (machineId: string, status: ShopfloorState['liveMachineStatuses'][string]) => void;
  updateLiveMetrics: (machineId: string, good: number, scrap: number, oee: number) => void;
}

// =========================================================================
// SECTION 1: LOCAL STORAGE BOOTSTRAP & DOM INITIALIZATION
// Restores persisted tokens, user profiles, and CSS custom theme palettes.
// =========================================================================

const savedPaletteStr = localStorage.getItem('mes_palette');
let initialPalette: ThemeColors | null = null;
if (savedPaletteStr) {
  try {
    initialPalette = JSON.parse(savedPaletteStr);
    if (initialPalette) {
      applyThemeToDOM(initialPalette);
    }
  } catch (e) {
    console.error('Failed to parse saved palette', e);
  }
}

// =========================================================================
// SECTION 2: ZUSTAND SHOPFLOOR STORE INITIALIZATION
// =========================================================================

export const useShopfloorStore = create<ShopfloorState>((set) => ({
  token: localStorage.getItem('mes_token') || null,
  user: JSON.parse(localStorage.getItem('mes_user') || 'null'),
  theme: (localStorage.getItem('mes_theme') as 'light' | 'dark') || 'light',
  activePalette: initialPalette,
  mode: 'standard',
  alerts: [],
  liveMachineStatuses: {},
  liveMachineOEE: {},
  liveGoodCounts: {},
  liveScrapCounts: {},

  // =========================================================================
  // SECTION 3: AUTHENTICATION & MULTI-TENANT SESSION MANAGEMENT
  // Synchronizes JWT tokens, user allocations, and site branding with LocalStorage.
  // =========================================================================

  /**
   * @function login
   * @description Hydrates store with authenticated user token and site profile.
   * Persists credentials to LocalStorage, applies the user's plant-specific theme colors
   * to the DOM, and resets dark mode indicators.
   * 
   * @param {string} token - Signed JWT bearer token
   * @param {User} user - Decoded user identity and plant tenancy metadata
   * @compliance 21 CFR Part 11 (§11.10(d) Limiting system access to authorized individuals)
   */
  login: (token, user) => {
    localStorage.setItem('mes_token', token);
    localStorage.setItem('mes_user', JSON.stringify(user));
    localStorage.setItem('mes_theme', 'light');
    if (user.theme?.colors) {
      localStorage.setItem('mes_palette', JSON.stringify(user.theme.colors));
      applyThemeToDOM(user.theme.colors);
    }
    const body = document.querySelector('body');
    const root = window.document.documentElement;
    if (body) body.removeAttribute('data-theme');
    if (root) root.classList.remove('dark');
    set({ token, user, alerts: [], liveMachineStatuses: {}, liveMachineOEE: {}, liveGoodCounts: {}, liveScrapCounts: {}, activePalette: user.theme?.colors || null, theme: 'light' });
  },

  /**
   * @function logout
   * @description Clears active session credentials and tokens from LocalStorage and resets store state.
   */
  logout: () => {
    localStorage.removeItem('mes_token');
    localStorage.removeItem('mes_user');
    set({ token: null, user: null, alerts: [], liveMachineStatuses: {}, liveMachineOEE: {}, liveGoodCounts: {}, liveScrapCounts: {} });
  },

  // =========================================================================
  // SECTION 4: DYNAMIC THEME & PALETTE SYNCHRONIZATION
  // Manages custom CSS variable injection, light/dark mode, and high-visibility modes.
  // =========================================================================

  /**
   * @function setActivePalette
   * @description Updates active color tokens in state and DOM root, persisting choices to LocalStorage.
   * 
   * @param {ThemeColors} palette - Design token color map
   */
  setActivePalette: (palette: ThemeColors) => {
    localStorage.setItem('mes_palette', JSON.stringify(palette));
    applyThemeToDOM(palette);
    set({ activePalette: palette });
  },

  /**
   * @function toggleTheme
   * @description Toggles between 'light' and 'dark' display modes across DOM body and root attributes.
   */
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('mes_theme', nextTheme);
    const body = document.querySelector('body');
    const root = window.document.documentElement;
    if (body) {
      if (nextTheme === 'dark') body.setAttribute('data-theme', 'dark');
      else body.removeAttribute('data-theme');
    }
    if (root) {
      if (nextTheme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    }
    return { theme: nextTheme };
  }),

  /**
   * @function setTheme
   * @description Directly sets target theme mode ('light' | 'dark').
   * 
   * @param {'light' | 'dark'} theme - Target theme mode
   */
  setTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem('mes_theme', theme);
    const body = document.querySelector('body');
    const root = window.document.documentElement;
    if (body) {
      if (theme === 'dark') body.setAttribute('data-theme', 'dark');
      else body.removeAttribute('data-theme');
    }
    if (root) {
      if (theme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    }
    set({ theme });
  },

  /**
   * @function toggleMode
   * @description Toggles between standard desktop UI and touch-optimized shopfloor 'factory' mode.
   */
  toggleMode: () => set((state) => {
    const nextMode = state.mode === 'standard' ? 'factory' : 'standard';
    const body = document.querySelector('body');
    if (body) {
      if (nextMode === 'factory') body.setAttribute('data-mode', 'factory');
      else body.removeAttribute('data-mode');
    }
    return { mode: nextMode };
  }),

  // =========================================================================
  // SECTION 5: REAL-TIME SHOPFLOOR ALERTS & NOTIFICATIONS
  // Dispatches critical machinery alarms, calibration reminders, and excursions.
  // =========================================================================

  /**
   * @function addAlert
   * @description Pushes a new alert notification into the store with auto-generated ID.
   * 
   * @param {Omit<AlertNotification, 'id' | 'isRead'>} alert - Alert details
   */
  addAlert: (alert) => set((state) => ({
    alerts: [
      { ...alert, id: `a-${Math.random().toString(36).substr(2, 9)}`, isRead: false },
      ...state.alerts,
    ],
  })),

  /**
   * @function markAlertAsRead
   * @description Marks a specific alert notification as acknowledged.
   * 
   * @param {string} id - Alert identifier
   */
  markAlertAsRead: (id) => set((state) => ({
    alerts: state.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
  })),

  /**
   * @function markAllAlertsAsRead
   * @description Marks all existing notifications as acknowledged.
   */
  markAllAlertsAsRead: () => set((state) => ({
    alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
  })),

  /**
   * @function clearAllAlerts
   * @description Purges all alert notifications from the in-memory store.
   */
  clearAllAlerts: () => set({ alerts: [] }),

  // =========================================================================
  // SECTION 6: REAL-TIME TELEMETRY & MACHINE OEE STATE MACHINE
  // Tracks live workstation states, scrap metrics, and ISO 22400 OEE percentages.
  // =========================================================================

  /**
   * @function updateLiveMachineState
   * @description Updates real-time operational state for a specific machine ID.
   * 
   * @param {string} machineId - Machine UUID
   * @param {string} status - New operational status (RUNNING, IDLE, BREAKDOWN, SETUP, MAINTENANCE)
   */
  updateLiveMachineState: (machineId, status) => set((state) => ({
    liveMachineStatuses: { ...state.liveMachineStatuses, [machineId]: status },
  })),

  /**
   * @function updateLiveMetrics
   * @description Updates live production counters and OEE efficiency for a workstation.
   * 
   * @param {string} machineId - Machine UUID
   * @param {number} good - Good units count
   * @param {number} scrap - Scrapped units count
   * @param {number} oee - Overall Equipment Effectiveness percentage (0-100)
   * @compliance ISO 22400 (KPIs for Manufacturing Operations Management)
   */
  updateLiveMetrics: (machineId, good, scrap, oee) => set((state) => ({
    liveGoodCounts: { ...state.liveGoodCounts, [machineId]: good },
    liveScrapCounts: { ...state.liveScrapCounts, [machineId]: scrap },
    liveMachineOEE: { ...state.liveMachineOEE, [machineId]: oee },
  })),
}));

