'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

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

  // 🎓 FONCTION POUR VÉRIFIER SI UN LIEN EST ACTIF
  // On vérifie une correspondance EXACTE pour éviter les faux positifs
  const isActive = (href: string) => {
    // Pour la page détail d'un projet (/projets/[id]), on considère "Projets" actif
    if (href === '/projets' && pathname.startsWith('/projets')) {
      return true;
    }
    // Pour les autres, correspondance exacte uniquement
    return pathname === href;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              <span className="text-2xl">📋</span>
              Mon Agenda
            </Link>
            
            {/* Navigation principale */}
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Bouton déconnexion */}
          <div className="flex items-center gap-4">
            {/* Indicateur de page actuelle (mobile) */}
            <div className="md:hidden text-sm font-medium text-gray-700">
              {navItems.find(item => isActive(item.href))?.label || 'Navigation'}
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-2"
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
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive(item.href)
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}