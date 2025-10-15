// themes/index.ts
import { Theme } from '@/types/theme';
import { defaultTheme } from './default';
import { sakuraTheme } from './sakura';

// Registre de tous les thèmes disponibles
export const themeRegistry: Record<string, Theme> = {
  default: defaultTheme,
  sakura: sakuraTheme,
};

// Fonction pour récupérer un thème par son ID
export function getTheme(id: string): Theme {
  return themeRegistry[id] || defaultTheme;
}

// Fonction pour enregistrer un thème personnalisé
export function registerCustomTheme(theme: Theme): void {
  themeRegistry[theme.id] = theme;
}

// Fonction pour obtenir tous les thèmes disponibles
export function getAllThemes(): Theme[] {
  return Object.values(themeRegistry);
}