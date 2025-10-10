'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { DashboardStats, UpcomingItem, ProjectAlert, ChartData, Task, Event, Project } from '../../lib/types';
import StatCard from '../../components/StatCard';
import UpcomingTimeline from '../../components/UpcomingTimeline';
import ProjectAlerts from '../../components/ProjectAlerts';
import TasksChart from '../../components/TasksChart';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    tasks: { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0, high_priority: 0 },
    events: { total: 0, today: 0, thisWeek: 0, upcoming: 0 },
    projects: { total: 0, active: 0, completed: 0, overBudget: 0, delayed: 0 }
  });
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [alerts, setAlerts] = useState<ProjectAlert[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Fonctions helper pour les dates
  const parseDate = (dateStr: string) => new Date(dateStr);
  
  const isAfter = (date1: Date, date2: Date) => date1.getTime() > date2.getTime();
  
  const isBefore = (date1: Date, date2: Date) => date1.getTime() < date2.getTime();
  
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  useEffect(() => {
    checkUser();
    loadDashboardData();

    // Polling pour synchronisation
    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const [tasksRes, eventsRes, projectsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, project:projects(*)')
          .eq('user_id', user.id),
        supabase
          .from('events')
          .select('*, project:projects(*)')
          .eq('user_id', user.id),
        supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
      ]);

      const tasks = tasksRes.data || [];
      const events = eventsRes.data || [];
      const projects = projectsRes.data || [];

      // Calculer les statistiques
      calculateStats(tasks, events, projects);
      
      // Générer la timeline des prochains événements
      generateUpcomingTimeline(tasks, events);
      
      // Générer les alertes projets
      generateProjectAlerts(projects, tasks);
      
      // Générer les données du graphique
      generateChartData(tasks);

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setLoading(false);
    }
  };

  const calculateStats = (tasks: Task[], events: Event[], projects: Project[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = addDays(today, 7);

    const newStats: DashboardStats = {
      tasks: {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => 
          t.due_date && 
          t.status !== 'done' && 
          isBefore(parseDate(t.due_date), now)
        ).length,
        high_priority: tasks.filter(t => t.priority === 'high' && t.status !== 'done').length
      },
      events: {
        total: events.length,
        today: events.filter(e => {
          const eventDate = parseDate(e.start_time);
          return eventDate >= today && eventDate < addDays(today, 1);
        }).length,
        thisWeek: events.filter(e => {
          const eventDate = parseDate(e.start_time);
          return eventDate >= today && eventDate < nextWeek;
        }).length,
        upcoming: events.filter(e => isAfter(parseDate(e.start_time), now)).length
      },
      projects: {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        overBudget: projects.filter(p => 
          p.budget_total && 
          p.budget_spent && 
          p.budget_spent > p.budget_total
        ).length,
        delayed: projects.filter(p => 
          p.end_date && 
          p.status === 'active' && 
          isBefore(parseDate(p.end_date), now)
        ).length
      }
    };

    setStats(newStats);
  };

  const generateUpcomingTimeline = (tasks: Task[], events: Event[]) => {
    const now = new Date();
    const nextWeek = addDays(now, 7);

    // Événements à venir (7 prochains jours)
    const upcomingEvents: UpcomingItem[] = events
      .filter(e => {
        const eventDate = parseDate(e.start_time);
        return eventDate >= now && eventDate <= nextWeek;
      })
      .map(e => ({
        id: e.id,
        type: 'event' as const,
        title: e.title,
        date: e.start_time,
        project: e.project ? {
          id: e.project.id,
          name: e.project.name,
          color: e.project.color
        } : undefined
      }));

    // Tâches à venir (7 prochains jours) non terminées
    const upcomingTasks: UpcomingItem[] = tasks
      .filter(t => 
        t.due_date && 
        t.status !== 'done' && 
        parseDate(t.due_date) >= now && 
        parseDate(t.due_date) <= nextWeek
      )
      .map(t => ({
        id: t.id,
        type: 'task' as const,
        title: t.title,
        date: t.due_date!,
        priority: t.priority,
        status: t.status,
        project: t.project ? {
          id: t.project.id,
          name: t.project.name,
          color: t.project.color
        } : undefined
      }));

    // Fusionner et trier par date
    const allItems = [...upcomingEvents, ...upcomingTasks]
      .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
      .slice(0, 8); // Limiter à 8 items

    setUpcomingItems(allItems);
  };

  const generateChartData = (tasks: Task[]) => {
    const data: ChartData[] = [
      {
        name: 'À faire',
        value: tasks.filter(t => t.status === 'todo').length,
        color: '#6366f1'
      },
      {
        name: 'En cours',
        value: tasks.filter(t => t.status === 'in_progress').length,
        color: '#f59e0b'
      },
      {
        name: 'Terminées',
        value: tasks.filter(t => t.status === 'done').length,
        color: '#10b981'
      }
    ];
    setChartData(data);
  };

  const generateProjectAlerts = (projects: Project[], tasks: Task[]) => {
    const now = new Date();
    const newAlerts: ProjectAlert[] = [];

    projects.forEach(project => {
      // Alerte budget dépassé
      if (project.budget_total && project.budget_spent && project.budget_spent > project.budget_total) {
        const overrun = project.budget_spent - project.budget_total;
        newAlerts.push({
          id: `budget-${project.id}`,
          project_id: project.id,
          project_name: project.name,
          type: 'budget',
          severity: 'danger',
          message: `Budget dépassé de ${overrun.toFixed(0)}€`,
          color: project.color
        });
      }

      // Alerte proche du budget
      if (project.budget_total && project.budget_spent && 
          project.budget_spent > project.budget_total * 0.9 &&
          project.budget_spent <= project.budget_total) {
        const remaining = project.budget_total - project.budget_spent;
        newAlerts.push({
          id: `budget-warning-${project.id}`,
          project_id: project.id,
          project_name: project.name,
          type: 'budget',
          severity: 'warning',
          message: `Plus que ${remaining.toFixed(0)}€ disponibles (${((remaining / project.budget_total) * 100).toFixed(0)}% restant)`,
          color: project.color
        });
      }

      // Alerte deadline dépassée
      if (project.end_date && project.status === 'active' && isBefore(parseDate(project.end_date), now)) {
        newAlerts.push({
          id: `deadline-${project.id}`,
          project_id: project.id,
          project_name: project.name,
          type: 'deadline',
          severity: 'danger',
          message: 'Date limite dépassée',
          color: project.color
        });
      }

      // Alerte tâches en retard
      const overdueTasks = tasks.filter(t => 
        t.project_id === project.id && 
        t.status !== 'done' && 
        t.due_date && 
        isBefore(parseDate(t.due_date), now)
      ).length;

      if (overdueTasks > 0) {
        newAlerts.push({
          id: `overdue-${project.id}`,
          project_id: project.id,
          project_name: project.name,
          type: 'overdue_tasks',
          severity: 'warning',
          message: `${overdueTasks} tâche${overdueTasks > 1 ? 's' : ''} en retard`,
          color: project.color
        });
      }
    });

    setAlerts(newAlerts);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600 mt-2">Vue d'ensemble de vos projets, tâches et événements</p>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Tâches actives"
            value={stats.tasks.total - stats.tasks.done}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="blue"
            subtitle={`${stats.tasks.high_priority} urgent${stats.tasks.high_priority > 1 ? 's' : ''}`}
            href="/taches"
          />

          <StatCard
            title="Tâches en retard"
            value={stats.tasks.overdue}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color={stats.tasks.overdue > 0 ? "red" : "green"}
            subtitle={stats.tasks.overdue > 0 ? "Action requise" : "Tout est à jour"}
            href="/taches"
          />

          <StatCard
            title="Événements cette semaine"
            value={stats.events.thisWeek}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="purple"
            subtitle={`${stats.events.today} aujourd'hui`}
            href="/calendrier"
          />

          <StatCard
            title="Projets actifs"
            value={stats.projects.active}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
            color="orange"
            subtitle={`${stats.projects.total} au total`}
            href="/projets"
          />
        </div>

        {/* Alertes et Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ProjectAlerts alerts={alerts} />
          <UpcomingTimeline items={upcomingItems} />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TasksChart data={chartData} />
          
          {/* Statistiques détaillées des tâches */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Détails des tâches</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="font-medium text-gray-700">À faire</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{stats.tasks.todo}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                  <span className="font-medium text-gray-700">En cours</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">{stats.tasks.in_progress}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="font-medium text-gray-700">Terminées</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{stats.tasks.done}</span>
              </div>

              {stats.tasks.overdue > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border-2 border-red-200">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-red-700">En retard</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{stats.tasks.overdue}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/taches')}
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
            >
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900">Nouvelle tâche</p>
                <p className="text-sm text-gray-600">Ajouter une tâche</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/calendrier')}
              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
            >
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900">Nouvel événement</p>
                <p className="text-sm text-gray-600">Planifier un RDV</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/projets')}
              className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-left"
            >
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900">Nouveau projet</p>
                <p className="text-sm text-gray-600">Démarrer un projet</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/taches')}
              className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
            >
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900">Voir mes tâches</p>
                <p className="text-sm text-gray-600">Gérer le Kanban</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}