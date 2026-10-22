/**
 * Dark theme is the product default; light exists so the OS setting is
 * respected. Status colours are never the only signal - every badge also
 * carries text.
 */
export const darkColors = {
  background: '#0B0F14',
  surface: '#141A21',
  surfaceRaised: '#1C242D',
  border: '#263040',
  textPrimary: '#F2F5F8',
  textSecondary: '#9AA7B4',
  textMuted: '#6B7885',
  accent: '#3B82F6',
  overdue: '#F0564A',
  dueToday: '#F5C04E',
  paid: '#34C77B',
  upcoming: '#8A95A3',
};

export type Colors = typeof darkColors;

export const lightColors: Colors = {
  background: '#F7F9FB',
  surface: '#FFFFFF',
  surfaceRaised: '#F0F3F7',
  border: '#DCE3EB',
  textPrimary: '#0B0F14',
  textSecondary: '#52606D',
  textMuted: '#7B8794',
  accent: '#2563EB',
  overdue: '#D93B2F',
  dueToday: '#C98A12',
  paid: '#1F9D5B',
  upcoming: '#6B7885',
};
