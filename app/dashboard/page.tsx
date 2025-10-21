'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface DashboardStats {
  tasks: {
    total: number;
    todo: number;
    in_progress: number;
    done: number;
    overdue: number;
  };
  events: {
    total: number;
    today: number;
    thisWeek: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    withTeam: number;
  };
  contacts: {
    total: number;
    groups: number;
    recentlyAdded: number;
  };
}

interface RecentProject {
  id: string;
  name: string;
  color?: string;
  status: string;
  member_count: number;
  group_count: number;
}

interface UpcomingItem {
  id: string;
  title: string;
  date: string;
  type: 'event' | 'task';
  priority?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    tasks: { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 },
    events: { total: 0, today: 0, thisWeek: 0 },
    projects: { total: 0, active: 0, completed: 0, withTeam: 0 },
    contacts: { total: 0, groups: 0, recentlyAdded: 0 }
  });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    checkUser();
    loadDashboardData();

    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger toutes les données en parallèle
      const [
        tasksRes,
        eventsRes,
        projectsRes,
        contactsRes,
        groupsRes,
        projectContactsRes,
        projectGroupsRes
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('events').select('*').eq('user_id', user.id),
        supabase.from('projects').select('*').eq('user_id', user.id),
        supabase.from('contacts').select('*').eq('user_id', user.id),
        supabase.from('contact_groups').select('*').eq('user_id', user.id),
        supabase.from('project_contacts').select('project_id'),
        supabase.from('project_contact_groups').select('project_id')
      ]);

      const tasks = tasksRes.data || [];
      const events = eventsRes.data || [];
      const projects = projectsRes.data || [];
      const contacts = contactsRes.data || [];
      const groups = groupsRes.data || [];
      const projectContacts = projectContactsRes.data || [];
      const projectGroups = projectGroupsRes.data || [];

      calculateStats(tasks, events, projects, contacts, groups, projectContacts);
      loadRecentProjects(projects, projectContacts, projectGroups);
      loadUpcomingItems(tasks, events);

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setLoading(false);
    }
  };

  const calculateStats = (
    tasks: any[],
    events: any[],
    projects: any[],
    contacts: any[],
    groups: any[],
    projectContacts: any[]
  ) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Contacts ajoutés dans les 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentContacts = contacts.filter(c => 
      new Date(c.created_at) >= sevenDaysAgo
    ).length;

    // Projets avec équipe
    const projectsWithTeam = new Set(projectContacts.map(pc => pc.project_id)).size;

    const newStats: DashboardStats = {
      tasks: {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => 
          t.due_date && 
          t.status !== 'done' && 
          new Date(t.due_date) < now
        ).length
      },
      events: {
        total: events.length,
        today: events.filter(e => {
          const eventDate = new Date(e.start_time);
          return eventDate >= today && eventDate < new Date(today.getTime() + 86400000);
        }).length,
        thisWeek: events.filter(e => {
          const eventDate = new Date(e.start_time);
          return eventDate >= today && eventDate < nextWeek;
        }).length
      },
      projects: {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        withTeam: projectsWithTeam
      },
      contacts: {
        total: contacts.length,
        groups: groups.length,
        recentlyAdded: recentContacts
      }
    };

    setStats(newStats);
  };

  const loadRecentProjects = async (
    projects: any[],
    projectContacts: any[],
    projectGroups: any[]
  ) => {
    const activeProjects = projects
      .filter(p => p.status === 'active')
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 4);

    const projectsWithCounts = activeProjects.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      status: p.status,
      member_count: projectContacts.filter(pc => pc.project_id === p.id).length,
      group_count: projectGroups.filter(pg => pg.project_id === p.id).length
    }));

    setRecentProjects(projectsWithCounts);
  };

  const loadUpcomingItems = (tasks: any[], events: any[]) => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingEvents = events
      .filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate >= now && eventDate <= nextWeek;
      })
      .map(e => ({
        id: e.id,
        title: e.title,
        date: e.start_time,
        type: 'event' as const
      }));

    const upcomingTasks = tasks
      .filter(t => 
        t.due_date && 
        t.status !== 'done' && 
        new Date(t.due_date) >= now && 
        new Date(t.due_date) <= nextWeek
      )
      .map(t => ({
        id: t.id,
        title: t.title,
        date: t.due_date,
        type: 'task' as const,
        priority: t.priority
      }));

    const allItems = [...upcomingEvents, ...upcomingTasks]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);

    setUpcomingItems(allItems);
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
          <h1 
            className="text-3xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            📊 Tableau de bord
          </h1>
          <p 
            className="mt-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Vue d'ensemble de votre activité
          </p>
        </div>

        {/* Statistiques principales - 2 rangées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Tâches */}
          <Link
            href="/taches"
            className="p-6 rounded-xl shadow-sm border hover:shadow-md transition-all"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary-light)' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              {stats.tasks.overdue > 0 && (
                <div 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: 'var(--color-error)20',
                    color: 'var(--color-error)'
                  }}
                >
                  {stats.tasks.overdue} en retard
                </div>
              )}
            </div>
            <div>
              <p 
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Tâches actives
              </p>
              <p 
                className="text-3xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {stats.tasks.total - stats.tasks.done}
              </p>
              <p 
                className="text-sm mt-2"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {stats.tasks.in_progress} en cours
              </p>
            </div>
          </Link>

          {/* Événements */}
          <Link
            href="/calendrier"
            className="p-6 rounded-xl shadow-sm border hover:shadow-md transition-all"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-secondary-light)' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--color-secondary)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              {stats.events.today > 0 && (
                <div 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: 'var(--color-secondary)20',
                    color: 'var(--color-secondary)'
                  }}
                >
                  {stats.events.today} aujourd'hui
                </div>
              )}
            </div>
            <div>
              <p 
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Événements
              </p>
              <p 
                className="text-3xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {stats.events.thisWeek}
              </p>
              <p 
                className="text-sm mt-2"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                cette semaine
              </p>
            </div>
          </Link>

          {/* Projets */}
          <Link
            href="/projets"
            className="p-6 rounded-xl shadow-sm border hover:shadow-md transition-all"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-warning)20' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--color-warning)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              {stats.projects.withTeam > 0 && (
                <div 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: 'var(--color-warning)20',
                    color: 'var(--color-warning)'
                  }}
                >
                  {stats.projects.withTeam} avec équipe
                </div>
              )}
            </div>
            <div>
              <p 
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Projets actifs
              </p>
              <p 
                className="text-3xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {stats.projects.active}
              </p>
              <p 
                className="text-sm mt-2"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                sur {stats.projects.total} total
              </p>
            </div>
          </Link>

          {/* Contacts */}
          <Link
            href="/contacts"
            className="p-6 rounded-xl shadow-sm border hover:shadow-md transition-all"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-success)20' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--color-success)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {stats.contacts.recentlyAdded > 0 && (
                <div 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: 'var(--color-success)20',
                    color: 'var(--color-success)'
                  }}
                >
                  +{stats.contacts.recentlyAdded} cette semaine
                </div>
              )}
            </div>
            <div>
              <p 
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Contacts
              </p>
              <p 
                className="text-3xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {stats.contacts.total}
              </p>
              <p 
                className="text-sm mt-2"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {stats.contacts.groups} groupes
              </p>
            </div>
          </Link>
        </div>

        {/* Projets récents et À venir */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Projets actifs récents */}
          <div 
            className="rounded-xl shadow-sm border p-6"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                📁 Projets actifs
              </h3>
              <Link 
                href="/projets"
                className="text-sm hover:opacity-80"
                style={{ color: 'var(--color-primary)' }}
              >
                Voir tout →
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <p 
                className="text-center py-8"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Aucun projet actif
              </p>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projets/${project.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:opacity-80 transition-all border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: project.color || 'var(--color-primary)' }}
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p 
                        className="font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {project.name}
                      </p>
                      <p 
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {project.member_count > 0 && `👥 ${project.member_count} membre${project.member_count > 1 ? 's' : ''}`}
                        {project.member_count > 0 && project.group_count > 0 && ' • '}
                        {project.group_count > 0 && `🏢 ${project.group_count} groupe${project.group_count > 1 ? 's' : ''}`}
                        {project.member_count === 0 && project.group_count === 0 && 'Aucune équipe'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* À venir */}
          <div 
            className="rounded-xl shadow-sm border p-6"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <h3 
              className="text-lg font-semibold mb-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              📅 À venir cette semaine
            </h3>

            {upcomingItems.length === 0 ? (
              <p 
                className="text-center py-8"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Rien de prévu cette semaine
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: item.type === 'event' 
                          ? 'var(--color-secondary-light)' 
                          : item.priority === 'high'
                          ? 'var(--color-error)20'
                          : 'var(--color-primary-light)'
                      }}
                    >
                      {item.type === 'event' ? (
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ color: 'var(--color-secondary)' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ 
                            color: item.priority === 'high' 
                              ? 'var(--color-error)' 
                              : 'var(--color-primary)' 
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p 
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.title}
                      </p>
                      <p 
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {new Date(item.date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: item.type === 'event' ? '2-digit' : undefined,
                          minute: item.type === 'event' ? '2-digit' : undefined
                        })}
                        {item.priority === 'high' && ' • ⚠️ Urgent'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Répartition des tâches */}
        <div 
          className="rounded-xl shadow-sm border p-6"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <h3 
            className="text-lg font-semibold mb-6"
            style={{ color: 'var(--color-text-primary)' }}
          >
            📊 Répartition des tâches
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="p-4 rounded-lg border-l-4"
              style={{
                backgroundColor: 'var(--color-primary-light)',
                borderLeftColor: 'var(--color-primary)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p 
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    À faire
                  </p>
                  <p 
                    className="text-3xl font-bold mt-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {stats.tasks.todo}
                  </p>
                </div>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary)20' }}
                >
                  <svg 
                    className="w-8 h-8" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div 
              className="p-4 rounded-lg border-l-4"
              style={{
                backgroundColor: 'var(--color-warning)20',
                borderLeftColor: 'var(--color-warning)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p 
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    En cours
                  </p>
                  <p 
                    className="text-3xl font-bold mt-1"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    {stats.tasks.in_progress}
                  </p>
                </div>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-warning)20' }}
                >
                  <svg 
                    className="w-8 h-8" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div 
              className="p-4 rounded-lg border-l-4"
              style={{
                backgroundColor: 'var(--color-success)20',
                borderLeftColor: 'var(--color-success)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p 
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Terminées
                  </p>
                  <p 
                    className="text-3xl font-bold mt-1"
                    style={{ color: 'var(--color-success)' }}
                  >
                    {stats.tasks.done}
                  </p>
                </div>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
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
              </div>
            </div>
          </div>

          {stats.tasks.overdue > 0 && (
            <div 
              className="mt-4 p-4 rounded-lg border-l-4 flex items-center justify-between"
              style={{
                backgroundColor: 'var(--color-error)20',
                borderLeftColor: 'var(--color-error)'
              }}
            >
              <div className="flex items-center gap-3">
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--color-error)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p 
                    className="font-semibold"
                    style={{ color: 'var(--color-error)' }}
                  >
                    {stats.tasks.overdue} tâche{stats.tasks.overdue > 1 ? 's' : ''} en retard
                  </p>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Action requise
                  </p>
                </div>
              </div>
              <Link
                href="/taches"
                className="px-4 py-2 rounded-lg font-medium text-white hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--color-error)' }}
              >
                Voir
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}