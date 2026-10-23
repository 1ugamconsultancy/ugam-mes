/**
 * @file themeEngine.ts
 * @module Frontend/Utils/ThemeEngine
 * @description Dynamic CSS custom properties (CSS variables) injection engine for multi-plant enterprise theming.
 * Provides curated industrial color presets engineered for automotive, discrete, cleanroom, food & beverage,
 * and high-contrast control room environments. Dynamically updates `:root` styles across the application runtime.
 * 
 * @compliance WCAG 2.1 AA Accessibility Contrast Ratios (Minimum 4.5:1 text-to-background contrast)
 * @compliance ISO 9241-112 (Ergonomics of Human-System Interaction: Principles for Information Presentation)
 */

/**
 * @interface ThemeColors
 * @description Defines CSS custom color variables utilized across all UI layouts, headers, and cards.
 * 
 * @property {string} bgPrimary - Primary page canvas background color (hex or rgba)
 * @property {string} bgSection - Elevated secondary container/section background color
 * @property {string} bgCard - Surface card background color
 * @property {string} textPrimary - High-contrast body and title typography color
 * @property {string} textSecondary - Subdued metadata and subtitle typography color
 * @property {string} borderColor - Structural boundary and card border color
 * @property {string} colorPrimary - Main interactive brand color (buttons, active pills)
 * @property {string} colorCorporate - Corporate navigation bar and hero banner background color
 * @property {string} colorAccent - High-visibility highlight color (golden tags, batch IDs)
 * @property {string} [colorRunning] - Green operational indicator color
 * @property {string} [colorIdle] - Amber standby indicator color
 * @property {string} [colorBreakdown] - Red alert indicator color
 */
export interface ThemeColors {
  bgPrimary: string;
  bgSection: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  colorPrimary: string;
  colorCorporate: string;
  colorAccent: string;
  colorRunning?: string;
  colorIdle?: string;
  colorBreakdown?: string;
}

/**
 * @interface PresetTheme
 * @description Bundled industrial branding preset configuration.
 * 
 * @property {string} id - Unique identifier slug for the preset
 * @property {string} name - Human-readable theme name
 * @property {string} description - Design rationale and manufacturing environment suitability
 * @property {string} industry - Recommended industrial vertical
 * @property {string[]} previewColors - 4-color palette swatch array for preview cards
 * @property {ThemeColors} colors - Complete CSS token dictionary
 */
export interface PresetTheme {
  id: string;
  name: string;
  description: string;
  industry: string;
  previewColors: string[];
  colors: ThemeColors;
}

// =========================================================================
// SECTION 1: INDUSTRIAL PRESET COLOR PALETTES
// Curated palettes calibrated for specific manufacturing and cleanroom domains.
// =========================================================================

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: 'ugam-navy',
    name: 'Ugam Corporate Navy',
    description: 'Corporate engineering precision with deep navy and Ugam gold highlights.',
    industry: 'Automotive & Discrete',
    previewColors: ['#FFFFFF', '#174A7C', '#F5A623', '#142A45'],
    colors: {
      bgPrimary: '#FFFFFF',
      bgSection: '#F4F5F6',
      bgCard: '#FFFFFF',
      textPrimary: '#171717',
      textSecondary: '#475569',
      borderColor: 'rgba(23, 74, 124, 0.20)',
      colorPrimary: '#174A7C',
      colorCorporate: '#142A45',
      colorAccent: '#F5A623',
      colorRunning: '#10B981',
      colorIdle: '#F5A623',
      colorBreakdown: '#EF4444',
    },
  },
  {
    id: 'auto-slate',
    name: 'Automotive Precision Slate',
    description: 'Cool slate-50 foundation with cobalt engineering accents for CNC machining and stamping.',
    industry: 'Tier-1 Automotive Machining',
    previewColors: ['#F8FAFC', '#2563EB', '#0284C7', '#0F172A'],
    colors: {
      bgPrimary: '#F8FAFC',
      bgSection: '#F1F5F9',
      bgCard: '#FFFFFF',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      borderColor: 'rgba(37, 99, 235, 0.20)',
      colorPrimary: '#2563EB',
      colorCorporate: '#1E293B',
      colorAccent: '#0284C7',
      colorRunning: '#10B981',
      colorIdle: '#F59E0B',
      colorBreakdown: '#EF4444',
    },
  },
  {
    id: 'food-emerald',
    name: 'Cleanroom Food Emerald',
    description: 'Hygienic fresh mint and organic emerald green designed for dairy, beverage and bakeries.',
    industry: 'Food & Beverage / GxP',
    previewColors: ['#F0FDF4', '#059669', '#10B981', '#064E3B'],
    colors: {
      bgPrimary: '#F0FDF4',
      bgSection: '#DCFCE7',
      bgCard: '#FFFFFF',
      textPrimary: '#064E3B',
      textSecondary: '#047857',
      borderColor: 'rgba(5, 150, 105, 0.25)',
      colorPrimary: '#059669',
      colorCorporate: '#065F46',
      colorAccent: '#10B981',
      colorRunning: '#10B981',
      colorIdle: '#F59E0B',
      colorBreakdown: '#EF4444',
    },
  },
  {
    id: 'dark-carbon',
    name: 'Dark Carbon OLED',
    description: 'Zero-glare high contrast dark canvas optimized for 24/7 night shift control rooms & shopfloor HMIs.',
    industry: 'Shopfloor HMIs & Night Shift',
    previewColors: ['#0B0F19', '#1E293B', '#3B82F6', '#F59E0B'],
    colors: {
      bgPrimary: '#0B0F19',
      bgSection: '#111827',
      bgCard: '#1E293B',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      borderColor: 'rgba(59, 130, 246, 0.25)',
      colorPrimary: '#3B82F6',
      colorCorporate: '#0F172A',
      colorAccent: '#F59E0B',
      colorRunning: '#10B981',
      colorIdle: '#F59E0B',
      colorBreakdown: '#EF4444',
    },
  },
  {
    id: 'safety-amber',
    name: 'High-Visibility Safety Amber',
    description: 'Extreme industrial contrast designed for dusty, foundry, and high-vibration manufacturing bays.',
    industry: 'Heavy Industrial & Foundry',
    previewColors: ['#121212', '#1E1E1E', '#F59E0B', '#FBBF24'],
    colors: {
      bgPrimary: '#121212',
      bgSection: '#1A1A1A',
      bgCard: '#242424',
      textPrimary: '#FFFFFF',
      textSecondary: '#D1D5DB',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      colorPrimary: '#F59E0B',
      colorCorporate: '#1A1A1A',
      colorAccent: '#FBBF24',
      colorRunning: '#10B981',
      colorIdle: '#F59E0B',
      colorBreakdown: '#EF4444',
    },
  },
  {
    id: 'royal-sapphire',
    name: 'Deep Royal Sapphire',
    description: 'Executive command center theme with deep marine sapphire and vibrant orange accents.',
    industry: 'Executive Cockpit & Lab QA',
    previewColors: ['#0B192C', '#1E3E62', '#008DDA', '#FF6500'],
    colors: {
      bgPrimary: '#0B192C',
      bgSection: '#14273E',
      bgCard: '#1E3E62',
      textPrimary: '#F1F5F9',
      textSecondary: '#93C5FD',
      borderColor: 'rgba(0, 141, 218, 0.30)',
      colorPrimary: '#008DDA',
      colorCorporate: '#0B192C',
      colorAccent: '#FF6500',
      colorRunning: '#10B981',
      colorIdle: '#F5A623',
      colorBreakdown: '#EF4444',
    },
  },
];

// =========================================================================
// SECTION 2: DOM INJECTION & CSS CUSTOM VARIABLE BINDING
// Mutates document.documentElement styles to seamlessly restyle all pages.
// =========================================================================

/**
 * @function applyThemeToDOM
 * @description Injects the specified theme's color token values directly into the DOM
 * root (`document.documentElement`), instantly updating all CSS variables across
 * the active browser session without requiring a page reload.
 * 
 * @param {ThemeColors} colors - Object containing color hexadecimal values for each design token
 * @returns {void}
 */
export const applyThemeToDOM = (colors: ThemeColors) => {
  if (!colors) return;
  const root = document.documentElement;
  if (colors.bgPrimary) root.style.setProperty('--bg-primary', colors.bgPrimary);
  if (colors.bgSection) root.style.setProperty('--bg-section', colors.bgSection);
  if (colors.bgCard) root.style.setProperty('--bg-card', colors.bgCard);
  if (colors.textPrimary) root.style.setProperty('--text-primary', colors.textPrimary);
  if (colors.textSecondary) root.style.setProperty('--text-secondary', colors.textSecondary);
  if (colors.borderColor) root.style.setProperty('--border-color', colors.borderColor);
  if (colors.colorPrimary) root.style.setProperty('--color-primary', colors.colorPrimary);
  if (colors.colorCorporate) root.style.setProperty('--color-corporate', colors.colorCorporate);
  if (colors.colorAccent) root.style.setProperty('--color-accent', colors.colorAccent);
};

