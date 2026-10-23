/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Corporate Brand Identity Palette from Image
        brand: {
          dark: '#111111',       // Primary dark (Near black)
          corporate: '#142A45',  // Corporate dark blue (Navy/blue)
          primary: '#174A7C',    // Primary blue (Engineering blue)
          accent: '#F5A623',     // Accent (Bright orange/yellow accent)
          white: '#FFFFFF',      // Main background
          lightGrey: '#F4F5F6',  // Section background (Light grey)
          mediumGrey: '#777777', // Secondary text (Medium grey)
          darkGrey: '#333333',   // Body text (Dark grey)
        },
        // Industrial Theme Mapping to Official Palette
        industrial: {
          dark: '#111111',        // Near black
          card: '#142A45',        // Corporate dark blue
          running: '#10b981',     // Emerald green
          idle: '#F5A623',        // Bright orange/yellow accent
          breakdown: '#ef4444',   // Red alert
          setup: '#174A7C',       // Engineering blue
          maintenance: '#8b5cf6', // Violet
          text: '#FFFFFF',        // White
          subtext: '#A3AFBD',     // Tinted secondary
          border: '#1F3A5C',      // Corporate border
        },
        light: {
          bg: '#FFFFFF',          // White
          section: '#F4F5F6',     // Light grey section background
          card: '#FFFFFF',        // White
          text: '#333333',        // Dark grey body text
          subtext: '#777777',     // Medium grey secondary text
          border: '#E3E5E8',      // Soft border
          primary: '#174A7C',     // Engineering blue
          accent: '#F5A623',      // Bright orange/yellow accent
        },
        // Direct scale overrides to systematically adapt all pages
        blue: {
          50: '#F0F5FA',
          100: '#E1EBF5',
          200: '#BAD0E8',
          300: '#8FB4DA',
          400: '#4B83B8',
          500: '#133E68',         // Deep engineering blue hover
          600: '#174A7C',         // Engineering blue (Primary Blue)
          700: '#142A45',         // Corporate dark blue
          800: '#102237',
          900: '#142A45',         // Corporate dark blue
          950: '#111111',         // Primary dark (Near black)
        },
        slate: {
          50: '#F4F5F6',          // Light grey (Section background)
          100: '#EBECEE',
          200: '#E2E5E8',
          300: '#CBD1D7',
          400: '#777777',         // Medium grey (Secondary text)
          500: '#666666',
          600: '#4D4D4D',
          700: '#333333',         // Dark grey (Body text)
          800: '#142A45',         // Corporate dark blue
          850: '#102237',
          900: '#111111',         // Primary dark (Near black)
          950: '#0B0B0B',
        },
        amber: {
          400: '#FBBF24',
          500: '#F5A623',         // Bright orange/yellow accent
          600: '#D98912',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Figma Mono', 'Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
