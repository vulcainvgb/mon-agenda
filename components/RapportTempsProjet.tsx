'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import moment from 'moment';
import 'moment/locale/fr'; // 🔥 AJOUT : locale française

moment.locale('fr'); // 🔥 AJOUT : activer la locale française

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  time_spent: number | null; // Temps passé en MINUTES
}

interface TimeStats {
  totalMinutes: number;
  totalHours: number;
  eventCount: number;
  taskCount: number;
  completedTaskCount: number;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

interface ContactGroup {
  id: string;
  name: string;
}

interface MonthFilter {
  year: number;
  month: number;
  label: string;
}

export default function RapportTempsProjet() {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 🔥 NOUVEAUX ÉTATS POUR LES FILTRES
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [availableMonths, setAvailableMonths] = useState<MonthFilter[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // Format: 'YYYY-MM' ou 'all'
  const [selectedContact, setSelectedContact] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  const [stats, setStats] = useState<TimeStats>({
    totalMinutes: 0,
    totalHours: 0,
    eventCount: 0,
    taskCount: 0,
    completedTaskCount: 0,
  });

  // 🔥 Helper pour détecter si une tâche est terminée
  const isTaskCompleted = (status: string): boolean => {
    return status === 'done';
  };

  // 🔥 Helper pour traduire les statuts en français
  const translateStatus = (status: string): string => {
    const translations: { [key: string]: string } = {
      'todo': 'À faire',
      'in_progress': 'En cours',
      'done': 'Terminé'
    };
    return translations[status] || status;
  };

  // Charger les projets
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  // Charger les données du projet sélectionné
  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject.id);
    }
  }, [selectedProject, selectedMonth, selectedContact, selectedGroup]); // 🔥 Recharger si filtres changent

  const loadProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Erreur chargement projets:', error);
    }
  };

  // 🔥 NOUVELLE FONCTION : Extraire les contacts et groupes uniques d'un projet
  const extractProjectContactsAndGroups = async (events: any[], tasks: any[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Collecter les IDs uniques de contacts
      const contactIds = new Set<string>();
      events.forEach(event => {
        event.event_contacts?.forEach((rel: any) => {
          if (rel.contact_id) contactIds.add(rel.contact_id);
        });
      });
      tasks.forEach(task => {
        task.task_contacts?.forEach((rel: any) => {
          if (rel.contact_id) contactIds.add(rel.contact_id);
        });
      });

      // Collecter les IDs uniques de groupes
      const groupIds = new Set<string>();
      events.forEach(event => {
        event.event_contact_groups?.forEach((rel: any) => {
          if (rel.group_id) groupIds.add(rel.group_id);
        });
      });
      tasks.forEach(task => {
        task.task_contact_groups?.forEach((rel: any) => {
          if (rel.group_id) groupIds.add(rel.group_id);
        });
      });

      // Charger les détails des contacts (seulement ceux utilisés dans le projet)
      if (contactIds.size > 0) {
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .in('id', Array.from(contactIds))
          .order('last_name', { ascending: true });

        if (contactsError) throw contactsError;
        setContacts(contactsData || []);
      } else {
        setContacts([]);
      }

      // Charger les détails des groupes (seulement ceux utilisés dans le projet)
      if (groupIds.size > 0) {
        const { data: groupsData, error: groupsError } = await supabase
          .from('contact_groups')
          .select('id, name')
          .in('id', Array.from(groupIds))
          .order('name', { ascending: true });

        if (groupsError) throw groupsError;
        setContactGroups(groupsData || []);
      } else {
        setContactGroups([]);
      }
    } catch (error) {
      console.error('Erreur extraction contacts/groupes:', error);
    }
  };

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Charger TOUS les événements du projet (sans filtre de date)
      const { data: allEventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          event_contacts (contact_id),
          event_contact_groups (group_id)
        `)
        .eq('user_id', session.user.id)
        .eq('project_id', projectId)
        .order('start_time', { ascending: false });

      if (eventsError) throw eventsError;

      // Charger TOUTES les tâches du projet
      const { data: allTasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          task_contacts (contact_id),
          task_contact_groups (group_id)
        `)
        .eq('user_id', session.user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // 🔥 Extraire les contacts et groupes utilisés dans ce projet
      await extractProjectContactsAndGroups(allEventsData || [], allTasksData || []);

      // 🔥 Générer la liste des mois disponibles
      generateAvailableMonths(allEventsData || [], allTasksData || []);

      // 🔥 Appliquer les filtres
      const filteredEvents = applyFilters(allEventsData || [], 'event');
      const filteredTasks = applyFilters(allTasksData || [], 'task');

      setEvents(filteredEvents);
      setTasks(filteredTasks);

      // Calculer les statistiques
      calculateStats(filteredEvents, filteredTasks);
    } catch (error) {
      console.error('Erreur chargement données projet:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Générer la liste des mois disponibles à partir des données
  const generateAvailableMonths = (events: any[], tasks: any[]) => {
    const monthsSet = new Set<string>();

    // Ajouter les mois des événements
    events.forEach(event => {
      const date = moment(event.start_time);
      const key = date.format('YYYY-MM');
      monthsSet.add(key);
    });

    // Ajouter les mois des tâches (basé sur created_at)
    tasks.forEach(task => {
      const date = moment(task.created_at);
      const key = date.format('YYYY-MM');
      monthsSet.add(key);
    });

    // Convertir en tableau et trier
    const monthsArray: MonthFilter[] = Array.from(monthsSet)
      .sort()
      .reverse() // Plus récent en premier
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

  // 🔥 Appliquer les filtres sur les événements ou tâches
  const applyFilters = (items: any[], type: 'event' | 'task') => {
    let filtered = [...items];

    // Filtre par mois
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-').map(Number);
      filtered = filtered.filter(item => {
        const date = moment(type === 'event' ? item.start_time : item.created_at);
        return date.year() === year && date.month() + 1 === month;
      });
    }

    // Filtre par contact
    if (selectedContact !== 'all') {
      const relationKey = type === 'event' ? 'event_contacts' : 'task_contacts';
      filtered = filtered.filter(item => {
        const relations = item[relationKey] || [];
        return relations.some((rel: any) => rel.contact_id === selectedContact);
      });
    }

    // Filtre par groupe
    if (selectedGroup !== 'all') {
      const relationKey = type === 'event' ? 'event_contact_groups' : 'task_contact_groups';
      filtered = filtered.filter(item => {
        const relations = item[relationKey] || [];
        return relations.some((rel: any) => rel.group_id === selectedGroup);
      });
    }

    return filtered;
  };

  const calculateStats = (eventsData: Event[], tasksData: Task[]) => {
    // Calculer le temps total des événements
    let totalMinutes = 0;
    let eventMinutes = 0;
    let taskMinutes = 0;
    
    eventsData.forEach(event => {
      const start = moment(event.start_time);
      const end = moment(event.end_time);
      const duration = moment.duration(end.diff(start));
      const mins = duration.asMinutes();
      eventMinutes += mins;
      totalMinutes += mins;
    });

    // Calculer le temps total des tâches avec time_spent (en MINUTES)
    tasksData.forEach(task => {
      if (task.time_spent && task.time_spent > 0) {
        taskMinutes += task.time_spent;
        totalMinutes += task.time_spent; // time_spent est déjà en minutes
      }
    });

    const completedTasks = tasksData.filter(t => 
      isTaskCompleted(t.status)
    ).length;

    setStats({
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      eventCount: eventsData.length,
      taskCount: tasksData.length,
      completedTaskCount: completedTasks,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} h`;
    return `${hours} h ${mins} min`;
  };

  const exportToCSV = () => {
    if (!selectedProject) return;

    const csvRows = [];
    
    // En-têtes
    csvRows.push(['Type', 'Titre', 'Date début', 'Date fin', 'Durée (min)', 'Description']);

    // Événements
    events.forEach(event => {
      const start = moment(event.start_time);
      const end = moment(event.end_time);
      const duration = moment.duration(end.diff(start)).asMinutes();
      
      csvRows.push([
        'Événement',
        event.title,
        start.format('DD/MM/YYYY HH:mm'),
        end.format('DD/MM/YYYY HH:mm'),
        Math.round(duration),
        event.description || ''
      ]);
    });

    // Tâches
    tasks.forEach(task => {
      const durationMinutes = task.time_spent || 0; // time_spent est déjà en minutes
      
      csvRows.push([
        'Tâche',
        task.title,
        moment(task.created_at).format('DD/MM/YYYY HH:mm'),
        isTaskCompleted(task.status) ? moment(task.updated_at).format('DD/MM/YYYY HH:mm') : 'En cours',
        durationMinutes, // Durée en minutes
        task.description || ''
      ]);
    });

    // Créer le CSV
    const csvContent = csvRows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Télécharger
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_temps_${selectedProject.name.replace(/\s/g, '_')}_${moment().format('YYYY-MM-DD')}.csv`;
    link.click();
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
          style={{ backgroundColor: 'var(--color-success)20' }}
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: 'var(--color-success)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Rapport de temps
        </h3>
        <p 
          className="text-sm mb-4"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Analyse du temps passé sur vos projets et événements
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
        className="rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
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
              style={{ backgroundColor: 'var(--color-success)20' }}
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--color-success)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Rapport de temps par projet
              </h2>
              <p 
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Sélectionnez un projet pour voir le temps passé
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
          {/* Sélection du projet */}
          <div className="mb-6">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sélectionnez un projet
            </label>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project || null);
                // 🔥 Réinitialiser les filtres lors du changement de projet
                setSelectedMonth('all');
                setSelectedContact('all');
                setSelectedGroup('all');
              }}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            >
              <option value="">-- Choisir un projet --</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* 🔥 FILTRES : Mois, Contact, Groupe */}
          {selectedProject && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

              {/* Filtre par contact */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  👤 Filtrer par contact
                </label>
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="all">Tous les contacts</option>
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
                  🏢 Filtrer par groupe
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="all">Tous les groupes</option>
                  {contactGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 🔥 Bouton réinitialiser les filtres */}
          {selectedProject && (selectedMonth !== 'all' || selectedContact !== 'all' || selectedGroup !== 'all') && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => {
                  setSelectedMonth('all');
                  setSelectedContact('all');
                  setSelectedGroup('all');
                }}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Réinitialiser les filtres
              </button>
            </div>
          )}

          {/* Statistiques */}
          {selectedProject && !loading && (
            <>
              {/* 🔥 Indicateur des filtres actifs */}
              {(selectedMonth !== 'all' || selectedContact !== 'all' || selectedGroup !== 'all') && (
                <div 
                  className="mb-4 p-3 rounded-lg border flex items-center gap-2 flex-wrap"
                  style={{
                    backgroundColor: 'var(--color-primary)10',
                    borderColor: 'var(--color-primary)30',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="font-medium">Filtres actifs :</span>
                  {selectedMonth !== 'all' && (
                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--color-primary)20' }}>
                      📅 {availableMonths.find(m => `${m.year}-${m.month}` === selectedMonth)?.label}
                    </span>
                  )}
                  {selectedContact !== 'all' && (
                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--color-primary)20' }}>
                      👤 {contacts.find(c => c.id === selectedContact)?.first_name} {contacts.find(c => c.id === selectedContact)?.last_name}
                    </span>
                  )}
                  {selectedGroup !== 'all' && (
                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--color-primary)20' }}>
                      🏢 {contactGroups.find(g => g.id === selectedGroup)?.name}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                    {stats.totalHours.toFixed(1)} h
                  </div>
                  <div 
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {Math.round(stats.totalMinutes)} minutes
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
                  <div 
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Rendez-vous
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
                  <div 
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Total
                  </div>
                </div>

                {/* Tâches terminées */}
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
                    Terminées
                  </div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-success)' }}
                  >
                    {stats.completedTaskCount}
                  </div>
                  <div 
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {stats.taskCount > 0 ? Math.round((stats.completedTaskCount / stats.taskCount) * 100) : 0}% complétées
                  </div>
                </div>
              </div>

              {/* Bouton export */}
              <div className="mb-4 flex justify-end">
                <button
                  onClick={exportToCSV}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exporter en CSV
                </button>
              </div>

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
                          className="rounded-lg p-4 border hover:shadow-sm transition-all"
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
                              {event.description && (
                                <p 
                                  className="text-sm mb-2"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  {event.description}
                                </p>
                              )}
                              <div 
                                className="text-xs flex items-center gap-3"
                                style={{ color: 'var(--color-text-tertiary)' }}
                              >
                                <span>📅 {start.format('DD/MM/YYYY')}</span>
                                <span>🕐 {start.format('HH:mm')} - {end.format('HH:mm')}</span>
                              </div>
                            </div>
                            <div 
                              className="text-right ml-4"
                            >
                              <div 
                                className="text-lg font-bold"
                                style={{ color: 'var(--color-success)' }}
                              >
                                {formatDuration(duration.asMinutes())}
                              </div>
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
                        className="rounded-lg p-4 border hover:shadow-sm transition-all"
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
                            {task.description && (
                              <p 
                                className="text-sm mb-2"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                {task.description}
                              </p>
                            )}
                            <div 
                              className="text-xs"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              Créée le {moment(task.created_at).format('DD/MM/YYYY')}
                              {task.started_at && (
                                <span> • Démarrée le {moment(task.started_at).format('DD/MM/YYYY HH:mm')}</span>
                              )}
                              {isTaskCompleted(task.status) && (
                                <span> • Terminée le {moment(task.updated_at).format('DD/MM/YYYY')}</span>
                              )}
                            </div>
                          </div>
                          {/* 🔥 Affichage du temps passé (time_spent en MINUTES) */}
                          {task.time_spent && task.time_spent > 0 && (
                            <div className="text-right ml-4">
                              <div 
                                className="text-lg font-bold"
                                style={{ color: 'var(--color-warning)' }}
                              >
                                {formatDuration(task.time_spent)} {/* time_spent est déjà en minutes */}
                              </div>
                              <div 
                                className="text-xs"
                                style={{ color: 'var(--color-text-tertiary)' }}
                              >
                                Temps passé
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message si aucune donnée */}
              {events.length === 0 && tasks.length === 0 && (
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
                    Aucun événement ou tâche associé à ce projet
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

          {/* Message si aucun projet sélectionné */}
          {!selectedProject && !loading && (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p 
                className="text-lg"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Sélectionnez un projet pour voir le rapport de temps
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
