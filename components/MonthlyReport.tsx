'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface MonthlyReportProps {
  projectId: string;
  projectName: string;
  projectColor?: string;
}

export default function MonthlyReport({ projectId, projectName, projectColor }: MonthlyReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadMonthlyEvents();
  }, [selectedMonth, projectId]);

  const loadMonthlyEvents = async () => {
    setLoading(true);
    
    // Calculer le début et la fin du mois sélectionné
    const [year, month] = selectedMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('project_id', projectId)
      .gte('start_time', startOfMonth.toISOString())
      .lte('start_time', endOfMonth.toISOString())
      .order('start_time', { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    
    setLoading(false);
  };

  // Calculer la durée d'un événement en minutes
  const calculateDuration = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  };

  // Formater la durée (minutes → "Xh Ymin")
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  // Calculer le total des heures du mois
  const totalMinutes = events.reduce((acc, event) => {
    return acc + calculateDuration(event.start_time, event.end_time);
  }, 0);

  // Grouper par semaine
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const eventsByWeek = events.reduce((acc, event) => {
    const weekNum = getWeekNumber(new Date(event.start_time));
    if (!acc[weekNum]) acc[weekNum] = [];
    acc[weekNum].push(event);
    return acc;
  }, {} as Record<number, Event[]>);

  // Export CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Événement', 'Début', 'Fin', 'Durée (min)'];
    const rows = events.map(event => [
      new Date(event.start_time).toLocaleDateString('fr-FR'),
      event.title,
      new Date(event.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      new Date(event.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      calculateDuration(event.start_time, event.end_time).toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_${projectName}_${selectedMonth}.csv`;
    link.click();
  };

  // Export PDF (version simple avec window.print)
  const exportToPDF = () => {
    window.print();
  };

  // Nom du mois en français
  const getMonthName = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <div 
      className="rounded-xl shadow-lg border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border)'
      }}
    >
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-primary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Rapport mensuel
              </h2>
              <p 
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {getMonthName(selectedMonth)} - {formatDuration(totalMinutes)} passées
              </p>
            </div>
          </div>
          <svg 
            className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Contenu du rapport */}
      {isExpanded && (
        <div 
          className="p-6 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Contrôles */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label 
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Mois :
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-success)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              
              <button
                onClick={exportToPDF}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-error)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimer
              </button>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div 
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: 'var(--color-primary-light)',
                borderColor: 'var(--color-primary)40'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Total heures
                  </p>
                  <p 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {formatDuration(totalMinutes)}
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: 'var(--color-secondary-light)',
                borderColor: 'var(--color-secondary)40'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Événements
                  </p>
                  <p 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {events.length}
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: 'var(--color-success)20',
                borderColor: 'var(--color-success)40'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-success)' }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Moyenne/événement
                  </p>
                  <p 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {events.length > 0 ? formatDuration(Math.round(totalMinutes / events.length)) : '0h'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Graphique par semaine */}
          {Object.keys(eventsByWeek).length > 0 && (
            <div 
              className="mb-6 p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <h3 
                className="text-sm font-semibold mb-3"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Répartition par semaine
              </h3>
              <div className="space-y-2">
                {Object.entries(eventsByWeek)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([week, weekEvents]) => {
                    const weekMinutes = weekEvents.reduce((acc, event) => 
                      acc + calculateDuration(event.start_time, event.end_time), 0
                    );
                    const percentage = totalMinutes > 0 ? (weekMinutes / totalMinutes) * 100 : 0;
                    
                    return (
                      <div key={week} className="flex items-center gap-3">
                        <span 
                          className="text-xs font-medium w-20"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Semaine {week}
                        </span>
                        <div 
                          className="flex-1 rounded-full h-6 relative overflow-hidden"
                          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                        >
                          <div 
                            className="h-6 rounded-full transition-all flex items-center justify-end pr-2"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: 'var(--color-primary)'
                            }}
                          >
                            {percentage > 15 && (
                              <span className="text-xs font-medium text-white">
                                {formatDuration(weekMinutes)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span 
                          className="text-xs w-16 text-right"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {weekEvents.length} evt
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Tableau des événements */}
          {loading ? (
            <div className="text-center py-8">
              <div 
                className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
                style={{ borderColor: 'var(--color-primary)' }}
              ></div>
              <p 
                className="mt-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Chargement...
              </p>
            </div>
          ) : events.length === 0 ? (
            <div 
              className="text-center py-8 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <svg 
                className="w-12 h-12 mx-auto mb-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Aucun événement ce mois-ci
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead 
                  className="border-b-2"
                  style={{ 
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Date
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Événement
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Début
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Fin
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Durée
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {events.map((event) => {
                    const duration = calculateDuration(event.start_time, event.end_time);
                    return (
                      <tr 
                        key={event.id} 
                        className="hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: 'var(--color-bg-primary)' }}
                      >
                        <td 
                          className="px-4 py-3 text-sm"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {new Date(event.start_time).toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: event.color }}
                            />
                            <span 
                              className="text-sm font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {event.title}
                            </span>
                          </div>
                          {event.description && (
                            <p 
                              className="text-xs mt-1"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              {event.description}
                            </p>
                          )}
                        </td>
                        <td 
                          className="px-4 py-3 text-sm"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {new Date(event.start_time).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td 
                          className="px-4 py-3 text-sm"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {new Date(event.end_time).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td 
                          className="px-4 py-3 text-sm font-medium text-right"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {formatDuration(duration)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot 
                  className="border-t-2"
                  style={{ 
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <tr>
                    <td 
                      colSpan={4} 
                      className="px-4 py-3 text-sm font-bold text-right"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      TOTAL
                    </td>
                    <td 
                      className="px-4 py-3 text-sm font-bold text-right"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {formatDuration(totalMinutes)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}