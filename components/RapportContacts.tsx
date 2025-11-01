'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface ContactGroup {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  color: string;
  project_id: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  time_spent: number | null;
  project_id: string;
}

interface ContactStats {
  projectCount: number;
  eventCount: number;
  taskCount: number;
  totalTimeMinutes: number;
}

interface HeatmapData {
  contactId: string;
  contactName: string;
  count: number;
  timeSpent: number;
}

interface MonthFilter {
  year: number;
  month: number;
  label: string;
}

export default function RapportContacts() {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [availableMonths, setAvailableMonths] = useState<MonthFilter[]>([]);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ContactStats>({
    projectCount: 0,
    eventCount: 0,
    taskCount: 0,
    totalTimeMinutes: 0,
  });

  // Charger les contacts et groupes actifs au montage
  useEffect(() => {
    if (isOpen) {
      loadActiveContactsAndGroups();
      loadHeatmapData();
    }
  }, [isOpen]);

  // Charger les données quand un contact/groupe ou filtre change
  useEffect(() => {
    if (selectedContact || selectedGroup) {
      loadContactData();
    }
  }, [selectedContact, selectedGroup, selectedMonth]);

  // Charger uniquement les contacts et groupes qui ont au moins une relation
  const loadActiveContactsAndGroups = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Récupérer tous les contacts avec au moins une relation
      const { data: eventContacts } = await supabase
        .from('event_contacts')
        .select('contact_id')
        .not('contact_id', 'is', null);

      const { data: taskContacts } = await supabase
        .from('task_contacts')
        .select('contact_id')
        .not('contact_id', 'is', null);

      const contactIds = new Set<string>();
      eventContacts?.forEach(rel => contactIds.add(rel.contact_id));
      taskContacts?.forEach(rel => contactIds.add(rel.contact_id));

      if (contactIds.size > 0) {
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email')
          .in('id', Array.from(contactIds))
          .eq('user_id', session.user.id)
          .order('last_name', { ascending: true });

        setContacts(contactsData || []);
      }

      // Récupérer tous les groupes avec au moins une relation
      const { data: eventGroups } = await supabase
        .from('event_contact_groups')
        .select('group_id')
        .not('group_id', 'is', null);

      const { data: taskGroups } = await supabase
        .from('task_contact_groups')
        .select('group_id')
        .not('group_id', 'is', null);

      const groupIds = new Set<string>();
      eventGroups?.forEach(rel => groupIds.add(rel.group_id));
      taskGroups?.forEach(rel => groupIds.add(rel.group_id));

      if (groupIds.size > 0) {
        const { data: groupsData } = await supabase
          .from('contact_groups')
          .select('id, name')
          .in('id', Array.from(groupIds))
          .eq('user_id', session.user.id)
          .order('name', { ascending: true });

        setContactGroups(groupsData || []);
      }
    } catch (error) {
      console.error('Erreur chargement contacts/groupes actifs:', error);
    }
  };

  // Charger les données heatmap
  const loadHeatmapData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Récupérer tous les événements avec contacts
      const { data: eventContactsData } = await supabase
        .from('event_contacts')
        .select(`
          contact_id,
          events!inner (
            user_id,
            start_time,
            end_time
          )
        `)
        .eq('events.user_id', session.user.id);

      // Récupérer toutes les tâches avec contacts
      const { data: taskContactsData } = await supabase
        .from('task_contacts')
        .select(`
          contact_id,
          tasks!inner (
            user_id,
            time_spent
          )
        `)
        .eq('tasks.user_id', session.user.id);

      // Compter par contact
      const heatmap = new Map<string, { count: number; timeSpent: number }>();

      eventContactsData?.forEach(rel => {
        if (!rel.contact_id) return;
        const event = rel.events as any;
        const duration = moment(event.end_time).diff(moment(event.start_time), 'minutes');
        
        const current = heatmap.get(rel.contact_id) || { count: 0, timeSpent: 0 };
        heatmap.set(rel.contact_id, {
          count: current.count + 1,
          timeSpent: current.timeSpent + duration
        });
      });

      taskContactsData?.forEach(rel => {
        if (!rel.contact_id) return;
        const task = rel.tasks as any;
        
        const current = heatmap.get(rel.contact_id) || { count: 0, timeSpent: 0 };
        heatmap.set(rel.contact_id, {
          count: current.count + 1,
          timeSpent: current.timeSpent + (task.time_spent || 0)
        });
      });

      // Charger les noms des contacts
      const contactIds = Array.from(heatmap.keys());
      if (contactIds.length > 0) {
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .in('id', contactIds);

        const heatmapArray: HeatmapData[] = contactsData?.map(contact => ({
          contactId: contact.id,
          contactName: `${contact.first_name} ${contact.last_name}`,
          count: heatmap.get(contact.id)?.count || 0,
          timeSpent: heatmap.get(contact.id)?.timeSpent || 0
        })) || [];

        // Trier par nombre d'occurrences (du plus actif au moins actif)
        heatmapArray.sort((a, b) => b.count - a.count);
        setHeatmapData(heatmapArray.slice(0, 20)); // Top 20
      }
    } catch (error) {
      console.error('Erreur chargement heatmap:', error);
    }
  };

  // Charger les données pour un contact ou groupe
  const loadContactData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let allEvents: any[] = [];
      let allTasks: any[] = [];

      // Charger par contact
      if (selectedContact) {
        // Événements du contact
        const { data: eventRels } = await supabase
          .from('event_contacts')
          .select(`
            event_id,
            events!inner (
              *,
              projects (id, name, color, status)
            )
          `)
          .eq('contact_id', selectedContact)
          .eq('events.user_id', session.user.id);

        allEvents = eventRels?.map(rel => ({
          ...(rel.events as any),
          project: (rel.events as any).projects
        })) || [];

        // Tâches du contact
        const { data: taskRels } = await supabase
          .from('task_contacts')
          .select(`
            task_id,
            tasks!inner (
              *,
              projects (id, name, color, status)
            )
          `)
          .eq('contact_id', selectedContact)
          .eq('tasks.user_id', session.user.id);

        allTasks = taskRels?.map(rel => ({
          ...(rel.tasks as any),
          project: (rel.tasks as any).projects
        })) || [];
      }

      // Charger par groupe
      if (selectedGroup) {
        // Événements du groupe
        const { data: eventGroupRels } = await supabase
          .from('event_contact_groups')
          .select(`
            event_id,
            events!inner (
              *,
              projects (id, name, color, status)
            )
          `)
          .eq('group_id', selectedGroup)
          .eq('events.user_id', session.user.id);

        const groupEvents = eventGroupRels?.map(rel => ({
          ...(rel.events as any),
          project: (rel.events as any).projects
        })) || [];
        allEvents = [...allEvents, ...groupEvents];

        // Tâches du groupe
        const { data: taskGroupRels } = await supabase
          .from('task_contact_groups')
          .select(`
            task_id,
            tasks!inner (
              *,
              projects (id, name, color, status)
            )
          `)
          .eq('group_id', selectedGroup)
          .eq('tasks.user_id', session.user.id);

        const groupTasks = taskGroupRels?.map(rel => ({
          ...(rel.tasks as any),
          project: (rel.tasks as any).projects
        })) || [];
        allTasks = [...allTasks, ...groupTasks];
      }

      // Dédupliquer (si un contact est dans un groupe)
      const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values());
      const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());

      // Générer les mois disponibles
      generateAvailableMonths(uniqueEvents, uniqueTasks);

      // Appliquer le filtre de mois
      const filteredEvents = applyMonthFilter(uniqueEvents, 'event');
      const filteredTasks = applyMonthFilter(uniqueTasks, 'task');

      // Extraire les projets uniques
      const projectsMap = new Map<string, Project>();
      [...filteredEvents, ...filteredTasks].forEach(item => {
        if (item.project) {
          projectsMap.set(item.project.id, item.project);
        }
      });

      setProjects(Array.from(projectsMap.values()));
      setEvents(filteredEvents);
      setTasks(filteredTasks);

      // Calculer les statistiques
      calculateStats(filteredEvents, filteredTasks, projectsMap.size);
    } catch (error) {
      console.error('Erreur chargement données contact:', error);
    } finally {
      setLoading(false);
    }
  };

  // Générer les mois disponibles
  const generateAvailableMonths = (events: any[], tasks: any[]) => {
    const monthsSet = new Set<string>();

    events.forEach(event => {
      const date = moment(event.start_time);
      monthsSet.add(date.format('YYYY-MM'));
    });

    tasks.forEach(task => {
      const date = moment(task.created_at);
      monthsSet.add(date.format('YYYY-MM'));
    });

    const monthsArray: MonthFilter[] = Array.from(monthsSet)
      .sort()
      .reverse()
      .map(key => {
        const [year, month] = key.split('-');
        const date = moment(`${year}-${month}-01`);
        return {
          year: parseInt(year),
          month: parseInt(month),
          label: date.format('MMMM YYYY')
        };
      });

    setAvailableMonths(monthsArray);
  };

  // Appliquer le filtre de mois
  const applyMonthFilter = (items: any[], type: 'event' | 'task') => {
    if (selectedMonth === 'all') return items;

    const [year, month] = selectedMonth.split('-').map(Number);
    return items.filter(item => {
      const date = moment(type === 'event' ? item.start_time : item.created_at);
      return date.year() === year && date.month() + 1 === month;
    });
  };

  // Calculer les statistiques
  const calculateStats = (events: any[], tasks: any[], projectCount: number) => {
    let totalMinutes = 0;

    // Temps des événements
    events.forEach(event => {
      const duration = moment(event.end_time).diff(moment(event.start_time), 'minutes');
      totalMinutes += duration;
    });

    // Temps des tâches
    tasks.forEach(task => {
      if (task.time_spent) {
        totalMinutes += task.time_spent;
      }
    });

    setStats({
      projectCount,
      eventCount: events.length,
      taskCount: tasks.length,
      totalTimeMinutes: totalMinutes
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} h`;
    return `${hours} h ${mins} min`;
  };

  const translateStatus = (status: string): string => {
    const translations: { [key: string]: string } = {
      'todo': 'À faire',
      'in_progress': 'En cours',
      'done': 'Terminé'
    };
    return translations[status] || status;
  };

  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className="rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-pointer"
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
          Analyse de l'implication des contacts dans vos projets avec heatmap
        </p>
        <div 
          className="text-xs font-medium px-3 py-1 rounded-full inline-block"
          style={{
            backgroundColor: 'var(--color-success)20',
            color: 'var(--color-success)'
          }}
        >
          ✨ Disponible
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
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
            <div>
              <h2 
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Rapport des contacts
              </h2>
              <p 
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Analysez l'implication de vos contacts dans vos projets
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
            style={{ backgroundColor: 'var(--color-hover)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Heatmap des contacts */}
          {heatmapData.length > 0 && (
            <div className="mb-6">
              <h3 
                className="text-lg font-semibold mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                🔥 Top 20 des contacts les plus actifs
              </h3>
              <div 
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {heatmapData.map((data, index) => {
                    const maxCount = heatmapData[0].count;
                    const intensity = (data.count / maxCount) * 100;
                    
                    return (
                      <div 
                        key={data.contactId}
                        className="flex items-center justify-between p-2 rounded cursor-pointer hover:shadow-sm transition-all"
                        style={{
                          backgroundColor: `rgba(var(--color-warning-rgb, 251, 191, 36), ${intensity / 100})`,
                          border: '1px solid var(--color-border)'
                        }}
                        onClick={() => {
                          setSelectedContact(data.contactId);
                          setSelectedGroup('');
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-xs font-bold px-2 py-1 rounded"
                            style={{ 
                              backgroundColor: 'var(--color-bg-primary)',
                              color: 'var(--color-text-secondary)'
                            }}
                          >
                            #{index + 1}
                          </span>
                          <span 
                            className="font-medium text-sm"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {data.contactName}
                          </span>
                        </div>
                        <div className="text-right">
                          <div 
                            className="text-sm font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {data.count} items
                          </div>
                          <div 
                            className="text-xs"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {formatDuration(data.timeSpent)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Filtre par contact */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                👤 Sélectionner un contact
              </label>
              <select
                value={selectedContact}
                onChange={(e) => {
                  setSelectedContact(e.target.value);
                  if (e.target.value) setSelectedGroup('');
                }}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <option value="">-- Choisir un contact --</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par groupe */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                🏢 Ou sélectionner un groupe
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  if (e.target.value) setSelectedContact('');
                }}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <option value="">-- Choisir un groupe --</option>
                {contactGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par mois */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                📅 Filtrer par mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <option value="all">Tous les mois</option>
                {availableMonths.map(month => (
                  <option key={`${month.year}-${month.month}`} value={`${month.year}-${month.month}`}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Statistiques */}
          {(selectedContact || selectedGroup) && !loading && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Projets */}
                <div 
                  className="rounded-lg p-4 border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div 
                    className="text-sm mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Projets
                  </div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-secondary)' }}
                  >
                    {stats.projectCount}
                  </div>
                </div>

                {/* Événements */}
                <div 
                  className="rounded-lg p-4 border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div 
                    className="text-sm mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Événements
                  </div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {stats.eventCount}
                  </div>
                </div>

                {/* Tâches */}
                <div 
                  className="rounded-lg p-4 border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div 
                    className="text-sm mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Tâches
                  </div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    {stats.taskCount}
                  </div>
                </div>

                {/* Temps total */}
                <div 
                  className="rounded-lg p-4 border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div 
                    className="text-sm mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Temps total
                  </div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-success)' }}
                  >
                    {Math.round(stats.totalTimeMinutes / 60)} h
                  </div>
                </div>
              </div>

              {/* Liste des projets */}
              {projects.length > 0 && (
                <div className="mb-6">
                  <h3 
                    className="text-lg font-semibold mb-3 flex items-center gap-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Projets impliqués ({projects.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {projects.map(project => (
                      <div 
                        key={project.id}
                        className="rounded-lg p-3 border flex items-center gap-3"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="flex-1">
                          <div 
                            className="font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {project.name}
                          </div>
                          <div 
                            className="text-xs"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            {project.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Liste des événements */}
              {events.length > 0 && (
                <div className="mb-6">
                  <h3 
                    className="text-lg font-semibold mb-3 flex items-center gap-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Événements ({events.length})
                  </h3>
                  <div className="space-y-2">
                    {events.map(event => {
                      const start = moment(event.start_time);
                      const end = moment(event.end_time);
                      const duration = moment.duration(end.diff(start));

                      return (
                        <div 
                          key={event.id}
                          className="rounded-lg p-4 border"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: event.color }}
                                />
                                <h4 
                                  className="font-medium"
                                  style={{ color: 'var(--color-text-primary)' }}
                                >
                                  {event.title}
                                </h4>
                              </div>
                              <div 
                                className="text-xs flex items-center gap-3"
                                style={{ color: 'var(--color-text-tertiary)' }}
                              >
                                <span>📅 {start.format('DD/MM/YYYY')}</span>
                                <span>🕐 {start.format('HH:mm')} - {end.format('HH:mm')}</span>
                                {event.project && (
                                  <span>📁 {event.project.name}</span>
                                )}
                              </div>
                            </div>
                            <div 
                              className="text-lg font-bold ml-4"
                              style={{ color: 'var(--color-success)' }}
                            >
                              {formatDuration(duration.asMinutes())}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Liste des tâches */}
              {tasks.length > 0 && (
                <div>
                  <h3 
                    className="text-lg font-semibold mb-3 flex items-center gap-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Tâches ({tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div 
                        key={task.id}
                        className="rounded-lg p-4 border"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 
                                className="font-medium"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                {task.title}
                              </h4>
                              <span 
                                className="text-xs px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: task.status === 'done'
                                    ? 'var(--color-success)20'
                                    : task.status === 'in_progress'
                                    ? 'var(--color-warning)20'
                                    : 'var(--color-text-tertiary)20',
                                  color: task.status === 'done'
                                    ? 'var(--color-success)'
                                    : task.status === 'in_progress'
                                    ? 'var(--color-warning)'
                                    : 'var(--color-text-tertiary)'
                                }}
                              >
                                {translateStatus(task.status)}
                              </span>
                            </div>
                            <div 
                              className="text-xs"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              Créée le {moment(task.created_at).format('DD/MM/YYYY')}
                              {task.project && (
                                <span> • 📁 {task.project.name}</span>
                              )}
                            </div>
                          </div>
                          {task.time_spent && task.time_spent > 0 && (
                            <div 
                              className="text-lg font-bold ml-4"
                              style={{ color: 'var(--color-warning)' }}
                            >
                              {formatDuration(task.time_spent)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message si aucune donnée */}
              {projects.length === 0 && events.length === 0 && tasks.length === 0 && (
                <div 
                  className="text-center py-12 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <svg 
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p 
                    className="text-lg"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Aucune activité trouvée pour cette sélection
                  </p>
                </div>
              )}
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div 
                className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                style={{ borderColor: 'var(--color-primary)' }}
              />
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Chargement des données...
              </p>
            </div>
          )}

          {/* Message initial */}
          {!selectedContact && !selectedGroup && !loading && (
            <div 
              className="text-center py-12 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)'
              }}
            >
              <svg 
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p 
                className="text-lg mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Sélectionnez un contact ou un groupe
              </p>
              <p 
                className="text-sm"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Ou cliquez sur un contact dans la heatmap ci-dessus
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
