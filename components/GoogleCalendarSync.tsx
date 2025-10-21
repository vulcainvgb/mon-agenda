// components/GoogleCalendarSync.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 

interface SyncStatus {
  connected: boolean;
  email?: string;
  lastSync?: string;
  syncEnabled?: boolean;
}

export default function GoogleCalendarSync() {
  const [status, setStatus] = useState<SyncStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStatus();
    
    // Vérifier les paramètres URL pour les messages de callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setMessage({ type: 'success', text: 'Google Calendar connecté avec succès!' });
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/calendrier');
    } else if (params.get('error')) {
      setMessage({ type: 'error', text: `Erreur: ${params.get('error')}` });
      window.history.replaceState({}, '', '/calendrier');
    }
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Erreur chargement status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      
      console.log('📡 Appel à /api/calendar/connect...');
      const response = await fetch('/api/calendar/connect', {
        credentials: 'include',
      });
      
      console.log('📡 Status:', response.status);
      console.log('📡 Content-Type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Réponse:', text);
        throw new Error(`Erreur ${response.status}: ${text}`);
      }
      
      const data = await response.json();
      console.log('📡 Data reçue:', data);
      
      if (data.authUrl) {
        console.log('↪️ Redirection vers Google...');
        window.location.href = data.authUrl;
      } else {
        throw new Error('URL Google manquante');
      }
    } catch (error: any) {
      console.error('❌ Erreur handleConnect:', error);
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Déconnecter Google Calendar ? Vos événements locaux seront conservés.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setStatus({ connected: false });
        setMessage({ type: 'success', text: 'Google Calendar déconnecté' });
      } else {
        throw new Error('Erreur de déconnexion');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
      });
      
      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Synchronisation réussie! ${result.imported} importés, ${result.exported} exportés${result.conflicts > 0 ? `, ${result.conflicts} conflits résolus` : ''}`
        });
        await loadStatus();
        
        // Recharger la page pour afficher les nouveaux événements
        window.location.reload();
      } else {
        setMessage({
          type: 'error',
          text: `Erreur: ${result.errors.join(', ')}`
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="rounded-lg shadow-sm p-4"
        style={{
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)'
        }}
      >
        <div className="animate-pulse flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded"
            style={{ background: 'var(--color-bg-secondary)' }}
          ></div>
          <div className="flex-1">
            <div 
              className="h-4 rounded w-1/2 mb-2"
              style={{ background: 'var(--color-bg-secondary)' }}
            ></div>
            <div 
              className="h-3 rounded w-1/3"
              style={{ background: 'var(--color-bg-secondary)' }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg shadow-sm p-4"
      style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)'
      }}
    >
      {/* Message de feedback */}
      {message && (
        <div 
          className="mb-4 p-3 rounded-lg flex items-start gap-2"
          style={{
            background: message.type === 'success' 
              ? 'rgba(34, 197, 94, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            color: message.type === 'success' 
              ? '#15803d' 
              : '#991b1b',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}
        >
          {message.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-sm flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Google Calendar */}
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent, var(--color-primary)) 100%)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
            </svg>
          </div>

          <div>
            <h3 
              className="font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Google Calendar
            </h3>
            {status.connected ? (
              <div 
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <p className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {status.email}
                </p>
                {status.lastSync && (
                  <p 
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--color-text-tertiary, var(--color-text-secondary))' }}
                  >
                    Dernière synchro: {new Date(status.lastSync).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            ) : (
              <p 
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Non connecté
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status.connected ? (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`btn-primary flex items-center gap-2 ${
                  syncing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Synchroniser
                  </>
                )}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={syncing}
                className="px-3 py-2 rounded-lg transition-colors"
                style={{
                  color: 'var(--color-text-secondary)',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-hover)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
                title="Déconnecter"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Connecter Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
}