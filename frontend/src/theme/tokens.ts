/**
 * GFC Fans Outlet — Centralized Design Tokens
 */

export const lightColors = {
  brand: {
    50:  '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE',
    300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6',
    600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A',
  },
  sidebar: {
    bg: '#0F172A', bgHover: '#1E293B', border: '#1E293B',
    text: '#CBD5E1', textMuted: '#64748B', textActive: '#FFFFFF',
    activeBg: '#2563EB',
  },
  bg: {
    app: '#F8FAFC', card: '#FFFFFF', cardAlt: '#F9FAFB',
    hover: '#F1F5F9', overlay: 'rgba(15, 23, 42, 0.45)', input: '#FFFFFF',
  },
  text: {
    primary: '#0F172A', secondary: '#475569',
    muted: '#94A3B8', inverse: '#FFFFFF',
  },
  border: { light: '#F1F5F9', base: '#E2E8F0', dark: '#CBD5E1' },
  success: '#059669', warning: '#D97706', danger: '#DC2626', info: '#0284C7',
} as const;

export const darkColors = {
  brand: lightColors.brand,
  sidebar: {
    bg: '#0B1220', bgHover: '#1E293B', border: '#1E293B',
    text: '#94A3B8', textMuted: '#64748B', textActive: '#FFFFFF',
    activeBg: '#2563EB',
  },
  bg: {
    app: '#0B1220', card: '#111827', cardAlt: '#0F172A',
    hover: '#1F2937', overlay: 'rgba(0, 0, 0, 0.6)', input: '#0F172A',
  },
  text: {
    primary: '#F1F5F9', secondary: '#94A3B8',
    muted: '#64748B', inverse: '#0F172A',
  },
  border: { light: '#1F2937', base: '#1F2937', dark: '#374151' },
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#0EA5E9',
} as const;

export const radius = {
  sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px',
} as const;

export const shadow = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
} as const;

export const font = {
  family: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  familyMono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
  size: {
    xs: '11px', sm: '12px', base: '13px', md: '14px',
    lg: '16px', xl: '18px', '2xl': '20px', '3xl': '24px', '4xl': '30px',
  },
} as const;

export const zIndex = {
  dropdown: 1000, sticky: 1020, modal: 1050, toast: 1080,
} as const;