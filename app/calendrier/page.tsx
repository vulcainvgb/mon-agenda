'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Event, Project } from '../../lib/types';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import moment from 'moment-timezone'; // ✅ Import moment-timezone
import 'moment/locale/fr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import EventModal from '../../components/EventModal';
import GoogleCalendarSync from '../../components/GoogleCalendarSync';

// ✅ Configuration du timezone par défaut
moment.tz.setDefault('Europe/Paris');
moment.locale('fr');

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Event;
}

// ✅ UTILITAIRES TIMEZONE CENTRALISÉS
const timezoneUtils = {
  // Parse une date de Supabase (format: "2025-01-15 15:00:00")
  // La date est stockée sans timezone, on la considère comme heure de Paris
  parseFromDB: (dateStr: string | Date): Date => {
    if (dateStr instanceof Date) return dateStr;
    
    // Format: "2025-01-15 15:00:00" ou "2025-01-15T15:00:00"
    const cleaned = String(dateStr)
      .replace(' ', 'T')
      .split('.')[0]
      .split('+')[0]
      .split('Z')[0];
    
    console.log('📥 DB → JS:', dateStr, '→', cleaned);
    
    // Parser en tant qu'heure de Paris
    const parsed = moment.tz(cleaned, 'Europe/Paris');
    const result = parsed.toDate();
    
    console.log('   Résultat:', result.toLocaleString('fr-FR'));
    return result;
  },

  // Formate une date JavaScript pour Supabase
  // On convertit en heure de Paris puis on formate sans timezone
  formatForDB: (date: Date): string => {
    const parisTime = moment(date).tz('Europe/Paris');
    const formatted = parisTime.format('YYYY-MM-DD HH:mm:ss');
    
    console.log('💾 JS → DB:', date.toLocaleString('fr-FR'), '→', formatted);
    return formatted;
  },

  // Pour les inputs datetime-local (format ISO sans timezone)
  formatForInput: (date: Date | string): string => {
    const momentDate = moment(date).tz('Europe/Paris');
    return momentDate.format('YYYY-MM-DDTHH:mm');
  }
};

export default function CalendrierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentView, setCurrentView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    color: '#3b82f6',
    project_id: ''
  });

  useEffect(() => {
    const debugSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('=== DEBUG SESSION CALENDRIER ===');
      console.log('Session existe:', !!session);
      console.log('User ID:', session?.user?.id);
      console.log('Email:', session?.user?.email);
      console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log('Offset:', new Date().getTimezoneOffset(), 'minutes');
    };
    debugSession();
  }, []);

  useEffect(() => {
    checkUser();
    loadData();
    
    // Polling toutes les 3 secondes
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Ajuster automatiquement l'heure de fin quand l'heure de début change
  useEffect(() => {
    if (showModal && formData.start_time) {
      const startMoment = moment(formData.start_time).tz('Europe/Paris');
      const endMoment = startMoment.clone().add(1, 'hour');
      const newEndTime = endMoment.format('YYYY-MM-DDTHH:mm');
      
      // Mettre à jour uniquement si l'heure de fin a changé (éviter boucle infinie)
      if (formData.end_time !== newEndTime) {
        console.log('⏰ Ajustement automatique heure de fin:', {
          start: startMoment.format('HH:mm'),
          end: endMoment.format('HH:mm')
        });
        
        setFormData(prev => ({
          ...prev,
          end_time: newEndTime
        }));
      }
    }
  }, [formData.start_time, showModal]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔐 checkUser - Session:', {
      hasSession: !!session,
      userId: session?.user?.id
    });
    
    if (!session) {
      console.log('⚠️ Pas de session, redirection vers /login');
      router.push('/login');
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [eventsRes, projectsRes] = await Promise.all([
        supabase.from('events').select('*, project:projects(*)').eq('user_id', user.id).order('start_time', { ascending: true }),
        supabase.from('projects').select('*').eq('user_id', user.id)
      ]);

      console.log('🔍 Événements reçus de Supabase:', eventsRes.data);

      if (eventsRes.data) {
        convertToCalendarEvents(eventsRes.data);
      }
      if (projectsRes.data) setProjects(projectsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      setLoading(false);
    }
  };

  const convertToCalendarEvents = (eventsData: Event[]) => {
    const converted = eventsData.map(event => {
      const calEvent = {
        id: event.id,
        title: event.title,
        start: timezoneUtils.parseFromDB(event.start_time),
        end: timezoneUtils.parseFromDB(event.end_time),
        resource: event
      };
      
      console.log('📅 Événement converti:', {
        title: calEvent.title,
        start: calEvent.start.toLocaleString('fr-FR'),
        end: calEvent.end.toLocaleString('fr-FR')
      });
      
      return calEvent;
    });
    
    setCalendarEvents(converted);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // ✅ Forcer end = start + 1 heure pour éviter les problèmes de timezone
    const startMoment = moment(start).tz('Europe/Paris');
    const endMoment = startMoment.clone().add(1, 'hour');
    
    console.log('🆕 Nouveau slot sélectionné:', {
      start: startMoment.format('DD/MM/YYYY HH:mm'),
      end: endMoment.format('DD/MM/YYYY HH:mm')
    });
    
    setFormData({
      title: '',
      description: '',
      start_time: startMoment.format('YYYY-MM-DDTHH:mm'),
      end_time: endMoment.format('YYYY-MM-DDTHH:mm'),
      color: '#3b82f6',
      project_id: ''
    });
    setSelectedEvent(null);
    setShowModal(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    const fullEvent = event.resource;
    console.log('📝 Édition événement:', {
      title: fullEvent.title,
      start: new Date(fullEvent.start_time).toLocaleString('fr-FR'),
      end: new Date(fullEvent.end_time).toLocaleString('fr-FR')
    });
    
    setSelectedEvent(fullEvent);
    setFormData({
      title: fullEvent.title,
      description: fullEvent.description || '',
      start_time: timezoneUtils.formatForInput(fullEvent.start_time),
      end_time: timezoneUtils.formatForInput(fullEvent.end_time),
      color: fullEvent.color,
      project_id: fullEvent.project_id || ''
    });
    setShowModal(true);
  };

  const handleEventDrop = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    try {
      setIsDragging(true);
      
      console.log('🎯 DROP - Déplacement événement:', {
        title: event.title,
        nouvelleStart: start.toLocaleString('fr-FR'),
        nouvelleFin: end.toLocaleString('fr-FR')
      });
      
      // Optimistic update
      const updatedEvents = calendarEvents.map(e => 
        e.id === event.id ? { ...e, start, end } : e
      );
      setCalendarEvents(updatedEvents);

      // Sauvegarde en DB
      const startFormatted = timezoneUtils.formatForDB(start);
      const endFormatted = timezoneUtils.formatForDB(end);

      const { error } = await supabase
        .from('events')
        .update({
          start_time: startFormatted,
          end_time: endFormatted
        })
        .eq('id', event.id);

      if (error) throw error;
      
      console.log('✅ Événement déplacé avec succès');
      
      setTimeout(() => loadData(), 500);
      setIsDragging(false);
    } catch (error) {
      console.error('❌ Erreur déplacement:', error);
      await loadData();
      setIsDragging(false);
    }
  }, [calendarEvents]);

  const handleEventResize = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    try {
      setIsDragging(true);
      
      console.log('↔️ RESIZE - Redimensionnement événement:', {
        title: event.title,
        nouvelleStart: start.toLocaleString('fr-FR'),
        nouvelleFin: end.toLocaleString('fr-FR')
      });
      
      const updatedEvents = calendarEvents.map(e => 
        e.id === event.id ? { ...e, start, end } : e
      );
      setCalendarEvents(updatedEvents);

      const { error } = await supabase
        .from('events')
        .update({
          start_time: timezoneUtils.formatForDB(start),
          end_time: timezoneUtils.formatForDB(end)
        })
        .eq('id', event.id);

      if (error) throw error;
      
      console.log('✅ Événement redimensionné avec succès');
      
      await loadData();
      setIsDragging(false);
    } catch (error) {
      console.error('❌ Erreur redimensionnement:', error);
      await loadData();
      setIsDragging(false);
    }
  }, [calendarEvents]);

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Les dates viennent des inputs datetime-local
      const startDate = moment.tz(formData.start_time, 'Europe/Paris').toDate();
      const endDate = moment.tz(formData.end_time, 'Europe/Paris').toDate();

      console.log('💾 Sauvegarde événement:', {
        title: formData.title,
        start: startDate.toLocaleString('fr-FR'),
        end: endDate.toLocaleString('fr-FR')
      });

      const eventData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        start_time: timezoneUtils.formatForDB(startDate),
        end_time: timezoneUtils.formatForDB(endDate),
        color: formData.color,
        project_id: formData.project_id || null
      };

      if (selectedEvent) {
        await supabase.from('events').update(eventData).eq('id', selectedEvent.id);
        console.log('✅ Événement mis à jour');
      } else {
        await supabase.from('events').insert([eventData]);
        console.log('✅ Événement créé');
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (confirm('Supprimer cet événement ?')) {
      try {
        await supabase.from('events').delete().eq('id', selectedEvent.id);
        console.log('✅ Événement supprimé');
        setShowModal(false);
        loadData();
      } catch (error) {
        console.error('❌ Erreur suppression:', error);
      }
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.resource.color || '#3b82f6',
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 5px'
      }
    };
  };

  const messages = {
    allDay: 'Journée',
    previous: 'Précédent',
    next: 'Suivant',
    today: "Aujourd'hui",
    month: 'Mois',
    week: 'Semaine',
    day: 'Jour',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Heure',
    event: 'Événement',
    noEventsInRange: 'Aucun événement dans cette période',
    showMore: (total: number) => `+ ${total} événement(s)`
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du calendrier...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendrier</h1>
              <p className="text-gray-600 mt-2">Gérez vos événements et rendez-vous</p>
            </div>
            <button
              onClick={() => {
                const now = moment().tz('Europe/Paris');
                const later = now.clone().add(1, 'hour'); // ✅ Utiliser .clone() pour ne pas muter 'now'
                
                setFormData({
                  title: '',
                  description: '',
                  start_time: now.format('YYYY-MM-DDTHH:mm'),
                  end_time: later.format('YYYY-MM-DDTHH:mm'),
                  color: '#3b82f6',
                  project_id: ''
                });
                setSelectedEvent(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvel événement
            </button>
          </div>
          
          <div className="mb-4">
            <GoogleCalendarSync />
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative" style={{ height: '700px' }}>
            {isDragging && (
              <div className="absolute top-4 right-4 z-10 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </div>
            )}

            <DragAndDropCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              messages={messages}
              views={['month', 'week', 'day']}
              view={currentView}
              onView={setCurrentView}
              date={currentDate}
              onNavigate={setCurrentDate}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              eventPropGetter={eventStyleGetter}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              resizable
              draggableAccessor={() => true}
            />
          </div>

          <EventModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            event={selectedEvent}
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </DndProvider>
  );
}