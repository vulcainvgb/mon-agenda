// components/theme-switcher.tsx
'use client';

import { useTheme } from '@/lib/theme-provider';

export function ThemeSwitcher() {
  const { themeId, setTheme, availableThemes } = useTheme();

  return (
    <div className="theme-switcher">
      <label htmlFor="theme-select" style={{ marginRight: '8px' }}>
        Thème :
      </label>
      <select 
        id="theme-select"
        value={themeId} 
        onChange={(e) => setTheme(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-text-secondary)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        {availableThemes.map(theme => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
}