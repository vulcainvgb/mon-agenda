// components/ThemeSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { themes, applyTheme, loadSavedTheme, type Theme } from '../lib/themes';

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Charger et appliquer le thème au montage
    const savedTheme = loadSavedTheme();
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const handleThemeChange = (themeId: string) => {
    const theme = themes[themeId];
    if (theme) {
      setCurrentTheme(theme);
      applyTheme(theme);
      setIsOpen(false);
    }
  };

  if (!currentTheme) return null;

  return (
    <div className="relative">
      {/* Bouton du sélecteur */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Changer le thème"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span className="hidden md:inline text-sm font-medium text-gray-700">
          {currentTheme.name}
        </span>
        <svg className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <>
          {/* Overlay pour fermer en cliquant à l'extérieur */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Liste des thèmes */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Choisir un thème
              </p>
            </div>
            
            {Object.values(themes).map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  currentTheme.id === theme.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Aperçu des couleurs */}
                  <div className="flex gap-1">
                    <div 
                      className="w-6 h-6 rounded-md border border-gray-200"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-md border border-gray-200"
                      style={{ backgroundColor: theme.colors.secondary }}
                    />
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {theme.name}
                    </p>
                  </div>
                </div>

                {/* Checkmark si sélectionné */}
                {currentTheme.id === theme.id && (
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}