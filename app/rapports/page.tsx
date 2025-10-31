'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import RapportTempsProjet from '../../components/RapportTempsProjet';

export default function RapportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--color-primary)' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen py-8"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-primary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 
              className="text-3xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Rapports utilisateur
            </h1>
          </div>
          <p 
            className="text-lg"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Consultez et exportez vos rapports d'activité
          </p>
        </div>

        {/* Types de rapports disponibles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Rapport Tâches */}
          <div 
            className="rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-not-allowed opacity-60"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--color-primary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Rapport des tâches
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Historique complet de toutes vos tâches terminées avec filtres et export
            </p>
            <div 
              className="text-xs font-medium px-3 py-1 rounded-full inline-block"
              style={{
                backgroundColor: 'var(--color-warning)20',
                color: 'var(--color-warning)'
              }}
            >
              Bientôt disponible
            </div>
          </div>

          {/* Rapport Projets */}
          <div 
            className="rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-not-allowed opacity-60"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-secondary-light)' }}
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--color-secondary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Rapport des projets
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Vue d'ensemble de tous vos projets avec statistiques détaillées
            </p>
            <div 
              className="text-xs font-medium px-3 py-1 rounded-full inline-block"
              style={{
                backgroundColor: 'var(--color-warning)20',
                color: 'var(--color-warning)'
              }}
            >
              Bientôt disponible
            </div>
          </div>

          {/* Rapport Temps - MAINTENANT DISPONIBLE ✨ */}
          <RapportTempsProjet />

          {/* Rapport Contacts */}
          <div 
            className="rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-not-allowed opacity-60"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-warning)20' }}
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--color-warning)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Rapport des contacts
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Liste et statistiques de vos contacts et groupes
            </p>
            <div 
              className="text-xs font-medium px-3 py-1 rounded-full inline-block"
              style={{
                backgroundColor: 'var(--color-warning)20',
                color: 'var(--color-warning)'
              }}
            >
              Bientôt disponible
            </div>
          </div>

          {/* Rapport Événements */}
          <div 
            className="rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-not-allowed opacity-60"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-error)20' }}
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--color-error)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Rapport des événements
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Historique de vos événements et rendez-vous
            </p>
            <div 
              className="text-xs font-medium px-3 py-1 rounded-full inline-block"
              style={{
                backgroundColor: 'var(--color-warning)20',
                color: 'var(--color-warning)'
              }}
            >
              Bientôt disponible
            </div>
          </div>

          {/* Rapport Personnalisé */}
          <div 
            className="rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-not-allowed opacity-60"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--color-primary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Rapport personnalisé
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Créez vos propres rapports avec filtres avancés
            </p>
            <div 
              className="text-xs font-medium px-3 py-1 rounded-full inline-block"
              style={{
                backgroundColor: 'var(--color-warning)20',
                color: 'var(--color-warning)'
              }}
            >
              Bientôt disponible
            </div>
          </div>
        </div>

        {/* Message informatif mis à jour */}
        <div 
          className="rounded-xl shadow-sm border p-8 text-center"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-success)20' }}
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-success)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Rapport de temps disponible ! 🎉
          </h3>
          <p 
            className="text-lg max-w-2xl mx-auto mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Le rapport de temps par projet est maintenant disponible. Cliquez sur la carte "Rapport de temps" pour analyser le temps passé sur vos projets.
          </p>
          <p 
            className="text-sm max-w-2xl mx-auto"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Les autres types de rapports seront bientôt disponibles. Vous pourrez consulter, filtrer et exporter vos données en CSV ou PDF.
          </p>
        </div>
      </div>
    </div>
  );
}
