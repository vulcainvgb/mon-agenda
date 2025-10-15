// lib/theme-provider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '@/types/theme';
import { getTheme, getAllThemes, registerCustomTheme } from '@/themes';

interface ThemeContextType {
  currentTheme: Theme;
  themeId: string;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
  customizeTheme: (customTheme: Partial<Theme>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState('default');
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme('default'));

  // Charger le thème depuis localStorage au montage
  useEffect(() => {
    const savedThemeId = localStorage.getItem('theme-id');
    if (savedThemeId) {
      const theme = getTheme(savedThemeId);
      setThemeId(savedThemeId);
      setCurrentTheme(theme);
    }

    // Charger un éventuel thème personnalisé
    const customThemeJson = localStorage.getItem('custom-theme');
    if (customThemeJson) {
      try {
        const customTheme = JSON.parse(customThemeJson);
        registerCustomTheme(customTheme);
      } catch (e) {
        console.error('Erreur lors du chargement du thème personnalisé:', e);
      }
    }
  }, []);

  // Appliquer les CSS variables à chaque changement de thème
  useEffect(() => {
    const root = document.documentElement;
    
    // Couleurs
    root.style.setProperty('--color-primary', currentTheme.colors.primary);
    root.style.setProperty('--color-secondary', currentTheme.colors.secondary);
    root.style.setProperty('--color-accent', currentTheme.colors.accent);
    root.style.setProperty('--color-background', currentTheme.colors.background);
    root.style.setProperty('--color-surface', currentTheme.colors.surface);
    root.style.setProperty('--color-text', currentTheme.colors.text);
    root.style.setProperty('--color-text-secondary', currentTheme.colors.textSecondary);
    
    // Polices
    root.style.setProperty('--font-heading', currentTheme.fonts.heading);
    root.style.setProperty('--font-body', currentTheme.fonts.body);
    
    // Espacements
    root.style.setProperty('--spacing-unit', `${currentTheme.spacing.unit}px`);
    
    // Effets
    root.style.setProperty('--border-radius', currentTheme.effects.borderRadius);
    root.style.setProperty('--shadow', currentTheme.effects.shadow);
    
    // Effets optionnels
    if (currentTheme.effects.backgroundImage) {
      root.style.setProperty('--background-image', currentTheme.effects.backgroundImage);
    }
    if (currentTheme.effects.backgroundPattern) {
      root.style.setProperty('--background-pattern', currentTheme.effects.backgroundPattern);
    }

    // Ajouter l'attribut data-theme pour le CSS
    document.body.setAttribute('data-theme', currentTheme.id);
  }, [currentTheme]);

  const handleSetTheme = (newThemeId: string) => {
    const theme = getTheme(newThemeId);
    setThemeId(newThemeId);
    setCurrentTheme(theme);
    localStorage.setItem('theme-id', newThemeId);
  };

  const customizeTheme = (customTheme: Partial<Theme>) => {
    const customized: Theme = {
      ...currentTheme,
      ...customTheme,
      id: 'custom',
      name: 'Thème personnalisé',
      description: 'Votre thème personnalisé',
    };
    
    setCurrentTheme(customized);
    setThemeId('custom');
    
    // Sauvegarder le thème personnalisé
    localStorage.setItem('custom-theme', JSON.stringify(customized));
    localStorage.setItem('theme-id', 'custom');
    
    // Enregistrer dans le registre
    registerCustomTheme(customized);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeId,
        setTheme: handleSetTheme,
        availableThemes: getAllThemes(),
        customizeTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé à l\'intérieur de ThemeProvider');
  }
  return context;
}