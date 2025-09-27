/**
 * Centralized theme configuration for the sports dashboard
 * Contains all color schemes, league definitions, and theme settings
 */

export const themeConfig = {
  // Base theme modes (dark/light)
  modes: {
    dark: {
      backgrounds: {
        primary: '#0f172a',    // Charcoal background
        secondary: '#1e293b',  // Slightly lighter charcoal
        tertiary: '#334155'    // Card/component backgrounds
      },
      text: {
        primary: '#f8fafc',    // Primary text (white-ish)
        secondary: '#cbd5e1',  // Secondary text (light grey)
        muted: '#94a3b8'       // Muted text (darker grey)
      },
      borders: {
        primary: '#475569',
        secondary: '#64748b'
      }
    },
    light: {
      backgrounds: {
        primary: '#f8fafc',    // Light grey background
        secondary: '#ffffff',  // Pure white
        tertiary: '#f1f5f9'    // Very light grey for cards
      },
      text: {
        primary: '#1e293b',    // Dark text
        secondary: '#64748b',  // Medium grey text
        muted: '#94a3b8'       // Muted grey text
      },
      borders: {
        primary: '#e2e8f0',
        secondary: '#cbd5e1'
      }
    }
  },

  // League-specific color schemes
  leagues: {
    'premier-league': {
      id: 'premier-league',
      name: 'Premier League',
      colors: {
        primary: '#6b21a8',    // Purple
        secondary: '#a855f7',  // Lighter purple
        accent: '#c084fc'      // Even lighter purple for highlights
      }
    },
    'la-liga': {
      id: 'la-liga', 
      name: 'La Liga',
      colors: {
        primary: '#dc2626',    // Red
        secondary: '#ef4444',  // Lighter red
        accent: '#f87171'      // Even lighter red for highlights
      }
    },
    'serie-a': {
      id: 'serie-a',
      name: 'Serie A', 
      colors: {
        primary: '#2563eb',    // Blue
        secondary: '#3b82f6',  // Lighter blue
        accent: '#60a5fa'      // Even lighter blue for highlights
      }
    },
    'bundesliga': {
      id: 'bundesliga',
      name: 'Bundesliga',
      colors: {
        primary: '#111827',    // Black
        secondary: '#ef4444',  // Red
        accent: '#f87171'      // Light red for highlights
      }
    }
  },

  // KPI and special highlighting colors
  kpi: {
    highlight: '#22c55e',      // Neon green for goals/assists
    success: '#10b981',        // Success green
    warning: '#f59e0b',        // Warning amber
    error: '#ef4444'           // Error red
  },

  // Typography settings
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      mono: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem', 
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },

  // Spacing and layout
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem'
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px'
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },

  // Transitions
  transitions: {
    fast: '0.15s ease',
    base: '0.3s ease',
    slow: '0.4s ease'
  }
};

/**
 * Default theme settings
 */
export const defaultTheme = {
  mode: 'dark',  // Default to dark mode as per requirements
  league: null   // No league selected by default
};

/**
 * Storage keys for theme persistence
 */
export const STORAGE_KEYS = {
  THEME_MODE: 'sports-dashboard-theme-mode',
  THEME_LEAGUE: 'sports-dashboard-theme-league'
};