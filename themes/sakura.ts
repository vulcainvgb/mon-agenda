// themes/sakura.ts
import { Theme } from '@/types/theme';

export const sakuraTheme: Theme = {
  id: 'sakura',
  name: 'Sakura Garden',
  description: 'Inspiré par les cerisiers japonais en fleurs',
  author: 'System',
  colors: {
    primary: '#FFB7C5',      // Rose pâle des pétales
    secondary: '#8B4789',    // Violet prune
    accent: '#FF69B4',       // Rose vif
    background: '#FFF5F7',   // Blanc rosé très pâle
    surface: '#FFFFFF',      // Blanc pur
    text: '#2D1B2E',        // Violet très foncé
    textSecondary: '#6B4C6F', // Violet grisé
  },
  fonts: {
    heading: '"Noto Serif JP", "Georgia", serif',
    body: '"Noto Sans JP", "Helvetica Neue", sans-serif',
  },
  spacing: {
    unit: 8,
  },
  effects: {
    borderRadius: '12px',
    shadow: '0 4px 20px rgba(255, 183, 197, 0.15)',
    backgroundImage: 'linear-gradient(135deg, #FFF5F7 0%, #FFE8EC 100%)',
    backgroundPattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFB7C5' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },
};