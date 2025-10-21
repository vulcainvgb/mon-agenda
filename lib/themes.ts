// lib/themes.ts
import React from 'react';

export interface Theme {
  id: string;
  name: string;
  colors: {
    // Couleurs principales
    primary: string;
    primaryHover: string;
    primaryLight: string;
    
    // Couleurs secondaires
    secondary: string;
    secondaryHover: string;
    secondaryLight: string;
    
    // Backgrounds
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    
    // Textes
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    
    // Bordures
    border: string;
    borderLight: string;
    
    // États
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export const themes: Record<string, Theme> = {
  // Thème par défaut (bleu actuel)
  default: {
    id: 'default',
    name: 'Bleu professionnel',
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryLight: '#dbeafe',
      
      secondary: '#8b5cf6',
      secondaryHover: '#7c3aed',
      secondaryLight: '#ede9fe',
      
      bgPrimary: '#ffffff',
      bgSecondary: '#f9fafb',
      bgTertiary: '#f3f4f6',
      
      textPrimary: '#111827',
      textSecondary: '#4b5563',
      textTertiary: '#9ca3af',
      
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    }
  },

  // Thème rose pâle et gris
  rosePale: {
    id: 'rosePale',
    name: 'Rose doux',
    colors: {
      primary: '#ec4899',
      primaryHover: '#db2777',
      primaryLight: '#fce7f3',
      
      secondary: '#f472b6',
      secondaryHover: '#ec4899',
      secondaryLight: '#fdf2f8',
      
      bgPrimary: '#ffffff',
      bgSecondary: '#fdf2f8',
      bgTertiary: '#fce7f3',
      
      textPrimary: '#1f2937',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      
      border: '#fbcfe8',
      borderLight: '#fce7f3',
      
      success: '#ec4899',
      warning: '#f472b6',
      error: '#be185d',
      info: '#f9a8d4',
    }
  },

  // Thème violet élégant
  violet: {
    id: 'violet',
    name: 'Violet élégant',
    colors: {
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      primaryLight: '#ede9fe',
      
      secondary: '#a78bfa',
      secondaryHover: '#8b5cf6',
      secondaryLight: '#f5f3ff',
      
      bgPrimary: '#ffffff',
      bgSecondary: '#faf5ff',
      bgTertiary: '#f3e8ff',
      
      textPrimary: '#1f2937',
      textSecondary: '#4b5563',
      textTertiary: '#9ca3af',
      
      border: '#e9d5ff',
      borderLight: '#f3e8ff',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#8b5cf6',
    }
  },

  // Thème vert nature
  nature: {
    id: 'nature',
    name: 'Vert nature',
    colors: {
      primary: '#10b981',
      primaryHover: '#059669',
      primaryLight: '#d1fae5',
      
      secondary: '#34d399',
      secondaryHover: '#10b981',
      secondaryLight: '#ecfdf5',
      
      bgPrimary: '#ffffff',
      bgSecondary: '#f0fdf4',
      bgTertiary: '#dcfce7',
      
      textPrimary: '#1f2937',
      textSecondary: '#4b5563',
      textTertiary: '#9ca3af',
      
      border: '#bbf7d0',
      borderLight: '#dcfce7',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
    }
  },
 
  //Thème Orange sunset
  sunset: {
    id: 'sunset',
    name: 'Orange sunset',
    colors: {
      primary: '#fda900',
      primaryHover: '#b57d0f',
      primaryLight: '#fadd9f',
      
      secondary: '#ffffff',
      secondaryHover: '#fae2a9',
      secondaryLight: '#fcda92',
      
      bgPrimary: '#ffffff',
      bgSecondary: '#f8e6d3',
      bgTertiary: '#fae7cd',
      
      textPrimary: '#7d3e00',
      textSecondary: '#a75f12',
      textTertiary: '#b07832',
      
      border: '#f8aa52',
      borderLight: '#ffd4ad',
      
      success: '#0ae89e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
    }
  },

  // Thème dark mode
  dark: {
    id: 'dark',
    name: 'Mode sombre',
    colors: {
      primary: '#3b82f6',
      primaryHover: '#60a5fa',
      primaryLight: '#1e3a8a',
      
      secondary: '#8b5cf6',
      secondaryHover: '#a78bfa',
      secondaryLight: '#4c1d95',
      
      bgPrimary: '#111827',
      bgSecondary: '#1f2937',
      bgTertiary: '#595d64ff',
      
      textPrimary: '#f9fafb',
      textSecondary: '#d1d5db',
      textTertiary: '#9ca3af',
      
      border: '#374151',
      borderLight: '#4b5563',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    }
  },

  // Thème Halloween festif
  nightmare: {
    id: 'nightmare',
    name: 'Halloween',
    colors: {
      primary: '#FF7F00',
      primaryHover: '#E66F00',
      primaryLight: '#FFA500',
      
      secondary: '#1A1A1A',
      secondaryHover: '#000000',
      secondaryLight: '#555555',
      
      bgPrimary: '#484e5aff',
      bgSecondary: '#1C1E26',
      bgTertiary: '#4B0082',
      
      textPrimary: '#F0F0F0',
      textSecondary: '#FFD700',
      textTertiary: '#AAAAAA',
      
      border: '#696969',
      borderLight: '#333333',
      
      success: '#2E8B57',
      warning: '#FFD700',
      error: '#8B0000',
      info: '#4682B4',
    }
  },
};

// ✨ Appliquer un thème - SYSTÈME COMBINÉ
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  // 1️⃣ Appliquer l'attribut data-theme (pour le CSS dans globals.css)
  root.setAttribute('data-theme', theme.id);
  
  // 2️⃣ Appliquer les variables CSS via JavaScript (fallback + surcharge possible)
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });
  
  // 3️⃣ Sauvegarder dans localStorage
  localStorage.setItem('app-theme', theme.id);
  
  console.log('🎨 Thème appliqué:', theme.name, '(ID:', theme.id + ')');
}

// Charger le thème sauvegardé
export function loadSavedTheme(): Theme {
  const savedThemeId = localStorage.getItem('app-theme');
  
  if (savedThemeId && themes[savedThemeId]) {
    console.log('📂 Thème chargé depuis localStorage:', savedThemeId);
    return themes[savedThemeId];
  }
  
  console.log('🎨 Thème par défaut chargé');
  return themes.default;
}

// Hook React pour utiliser les thèmes
export function useTheme() {
  const [currentTheme, setCurrentTheme] = React.useState<Theme>(() => loadSavedTheme());
  
  React.useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);
  
  const changeTheme = (themeId: string) => {
    const theme = themes[themeId];
    if (theme) {
      setCurrentTheme(theme);
    }
  };
  
  return {
    currentTheme,
    changeTheme,
    availableThemes: Object.values(themes),
  };
}