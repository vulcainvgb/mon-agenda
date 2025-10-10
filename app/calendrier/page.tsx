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
import moment from 'moment';
import 'moment/locale/fr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import EventModal from '../../components/EventModal';

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
    checkUser();
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) router.push('/login');
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [eventsRes, projectsRes] = await Promise.all([
        supabase.from('events').select('*, project:projects(*)').eq('user_id', user.id).order('start_time', { ascending: true }),
        supabase.from('projects').select('*').eq('user_id', user.id)
      ]);

      if (eventsRes.data) {
        convertToCalendarEvents(eventsRes.data);
      }
      if (projectsRes.data) setProjects(projectsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  const convertToCalendarEvents = (eventsData: Event[]) => {
    const converted = eventsData.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_time + 'Z'), // Le 'Z' force l'interprétation comme UTC, puis convertit en local
      end: new Date(event.end_time + 'Z'),
      resource: event
    }));
    setCalendarEvents(converted);
  };

  const formatLocalDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setFormData({
      title: '',
      description: '',
      start_time: moment(start).format('YYYY-MM-DDTHH:mm'),
      end_time: moment(end).format('YYYY-MM-DDTHH:mm'),
      color: '#3b82f6',
      project_id: ''
    });
    setSelectedEvent(null);
    setShowModal(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    const fullEvent = event.resource;
    setSelectedEvent(fullEvent);
    setFormData({
      title: fullEvent.title,
      description: fullEvent.description || '',
      start_time: moment(fullEvent.start_time).format('YYYY-MM-DDTHH:mm'),
      end_time: moment(fullEvent.end_time).format('YYYY-MM-DDTHH:mm'),
      color: fullEvent.color,
      project_id: fullEvent.project_id || ''
    });
    setShowModal(true);
  };

  const handleEventDrop = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    try {
      setIsDragging(true);
      const updatedEvents = calendarEvents.map(e => 
        e.id === event.id ? { ...e, start: new Date(start), end: new Date(end) } : e
      );
      setCalendarEvents(updatedEvents);

      const { error } = await supabase
        .from('events')
        .update({
          start_time: formatLocalDateTime(new Date(start)),
          end_time: formatLocalDateTime(new Date(end))
        })
        .eq('id', event.id);

      if (error) throw error;
      await loadData();
      setIsDragging(false);
    } catch (error) {
      console.error('Erreur déplacement:', error);
      await loadData();
      setIsDragging(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarEvents]);

  const handleEventResize = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    try {
      setIsDragging(true);
      const updatedEvents = calendarEvents.map(e => 
        e.id === event.id ? { ...e, start: new Date(start), end: new Date(end) } : e
      );
      setCalendarEvents(updatedEvents);

      const { error } = await supabase
        .from('events')
        .update({
          start_time: formatLocalDateTime(new Date(start)),
          end_time: formatLocalDateTime(new Date(end))
        })
        .eq('id', event.id);

      if (error) throw error;
      await loadData();
      setIsDragging(false);
    } catch (error) {
      console.error('Erreur redimensionnement:', error);
      await loadData();
      setIsDragging(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarEvents]);

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date(formData.start_time);
      const endDate = new Date(formData.end_time);

      const eventData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        start_time: formatLocalDateTime(startDate),
        end_time: formatLocalDateTime(endDate),
        color: formData.color,
        project_id: formData.project_id || null
      };

      if (selectedEvent) {
        await supabase.from('events').update(eventData).eq('id', selectedEvent.id);
      } else {
        await supabase.from('events').insert([eventData]);
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (confirm('Supprimer cet événement ?')) {
      try {
        await supabase.from('events').delete().eq('id', selectedEvent.id);
        setShowModal(false);
        loadData();
      } catch (error) {
        console.error('Erreur suppression:', error);
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
                setFormData({
                  title: '',
                  description: '',
                  start_time: moment().format('YYYY-MM-DDTHH:mm'),
                  end_time: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
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