// themes/default.ts
import { Theme } from '@/types/theme';

export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default',
  description: 'Clean and modern default theme',
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
  },
  fonts: {
    heading: '"Inter", sans-serif',
    body: '"Inter", sans-serif',
  },
  spacing: {
    unit: 8,
  },
  effects: {
    borderRadius: '8px',
    shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
};