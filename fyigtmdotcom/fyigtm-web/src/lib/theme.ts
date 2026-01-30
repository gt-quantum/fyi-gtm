// FYI GTM Design System
// Grayscale theme with flat design

export const theme = {
  light: {
    // Core backgrounds - Pure whites and grays
    background: '#FFFFFF',
    backgroundSecondary: '#FAFAFA',
    backgroundTertiary: '#F5F5F5',

    // Typography
    text: '#0A0A0A',
    textMuted: '#525252',
    textLight: '#737373',

    // Brand colors - Grayscale
    primary: '#0A0A0A',
    primaryLight: '#262626',
    primaryDark: '#000000',

    // Status colors - Grayscale variants
    success: '#525252',
    warning: '#737373',
    error: '#A3A3A3',

    // UI elements
    border: 'rgba(0, 0, 0, 0.1)',
    borderHover: 'rgba(0, 0, 0, 0.2)',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
    tagBg: 'rgba(0, 0, 0, 0.05)',
    tagBgHover: 'rgba(0, 0, 0, 0.1)',

    // Interactive
    hover: 'rgba(0, 0, 0, 0.04)',
    active: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    // Core backgrounds - Deep blacks and grays
    background: '#0A0A0A',
    backgroundSecondary: '#141414',
    backgroundTertiary: '#1F1F1F',

    // Typography
    text: '#FAFAFA',
    textMuted: '#A3A3A3',
    textLight: '#737373',

    // Brand colors - Grayscale
    primary: '#FFFFFF',
    primaryLight: '#E5E5E5',
    primaryDark: '#D4D4D4',

    // Status colors - Grayscale variants
    success: '#A3A3A3',
    warning: '#737373',
    error: '#525252',

    // UI elements
    border: 'rgba(255, 255, 255, 0.12)',
    borderHover: 'rgba(255, 255, 255, 0.25)',
    cardBg: '#141414',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    tagBg: 'rgba(255, 255, 255, 0.08)',
    tagBgHover: 'rgba(255, 255, 255, 0.15)',

    // Interactive
    hover: 'rgba(255, 255, 255, 0.06)',
    active: 'rgba(255, 255, 255, 0.12)',
  },
};

// Shadows - Subtle and minimal
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 2px 8px rgba(0, 0, 0, 0.08)',
  lg: '0 4px 16px rgba(0, 0, 0, 0.1)',
  xl: '0 8px 24px rgba(0, 0, 0, 0.12)',
  glow: '0 0 20px rgba(255, 255, 255, 0.1)',
};

// Spacing (8px grid)
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};

// Border radius - ALL ZERO for flat design
export const radius = {
  sm: '0',
  md: '0',
  lg: '0',
  xl: '0',
  full: '0',
};

// Typography
export const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  heading: {
    fontSize: '32px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  subheading: {
    fontSize: '20px',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  body: {
    fontSize: '16px',
    fontWeight: 400,
    letterSpacing: '0',
    lineHeight: 1.6,
  },
  caption: {
    fontSize: '14px',
    fontWeight: 400,
    letterSpacing: '0',
    lineHeight: 1.5,
  },
  small: {
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.02em',
    lineHeight: 1.4,
  },
};

// Animation presets (for Framer Motion)
export const animation = {
  spring: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 35,
  },
  springGentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
  },
  fade: {
    duration: 0.2,
  },
  standard: {
    duration: 0.3,
    ease: 'easeOut' as const,
  },
  hover: {
    duration: 0.2,
    ease: 'easeInOut' as const,
  },
};

// Breakpoints
export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
};

// Type exports
export type Theme = typeof theme.light;
export type ThemeMode = 'light' | 'dark';
