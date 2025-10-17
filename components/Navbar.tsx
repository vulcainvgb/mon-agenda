'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import ThemeSelector from './ThemeSelector';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
    { href: '/calendrier', label: 'Calendrier', icon: '📅' },
    { href: '/taches', label: 'Tâches', icon: '✅' },
    { href: '/projets', label: 'Projets', icon: '📁' },
  ];

  const isActive = (href: string) => {
    if (href === '/projets' && pathname.startsWith('/projets')) {
      return true;
    }
    return pathname === href;
  };

  return (
    <nav 
      className="shadow-sm border-b"
      style={{ 
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-xl font-bold transition-colors hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}
            >
              <span className="text-2xl">📋</span>
              Mon Agenda
            </Link>
            
            {/* Navigation principale */}
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: active 
                        ? 'var(--color-primary-light)' 
                        : 'transparent',
                      color: active 
                        ? 'var(--color-primary)' 
                        : 'var(--color-text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions à droite */}
          <div className="flex items-center gap-4">
            {/* ThemeSelector */}
            <ThemeSelector />
            
            {/* Indicateur de page actuelle (mobile) */}
            <div 
              className="md:hidden text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {navItems.find(item => isActive(item.href))?.label || 'Navigation'}
            </div>
            
            {/* Bouton déconnexion */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2"
              style={{ color: 'var(--color-error)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Navigation mobile (en dessous) */}
        <div className="md:hidden pb-3 pt-2 flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2"
                style={{
                  backgroundColor: active 
                    ? 'var(--color-primary-light)' 
                    : 'transparent',
                  color: active 
                    ? 'var(--color-primary)' 
                    : 'var(--color-text-secondary)',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}