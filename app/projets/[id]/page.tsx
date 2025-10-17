'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import MonthlyReport from '../../../components/MonthlyReport'

interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  color?: string
  status: 'active' | 'archived' | 'completed'
  budget_total?: number
  budget_spent?: number
  start_date?: string
  end_date?: string
  created_at?: string
  updated_at?: string
  time_spent?: number
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  due_date?: string
  created_at?: string
}

interface Event {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  created_at?: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Formulaire tâche rapide
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  
  // Formulaire événement rapide
  const [showEventForm, setShowEventForm] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventStart, setNewEventStart] = useState('')
  const [newEventEnd, setNewEventEnd] = useState('')
  
  useEffect(() => {
    checkUser()
    loadProjectData()
  }, [projectId])
  
  // Polling
  useEffect(() => {
    if (!user) return
    
    const interval = setInterval(() => {
      loadProjectData()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [user, projectId])
  
  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUser(data.user)
    } else {
      router.push('/login')
    }
  }
  
  const loadProjectData = async () => {
    setIsRefreshing(true)
    
    // Charger le projet
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (projectError) {
      console.error('Erreur chargement projet:', projectError)
      router.push('/projets')
      return
    }
    
    setProject(projectData)
    
    // Charger les tâches du projet
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    if (!tasksError) {
      setTasks(tasksData || [])
    }
    
    // Charger les événements du projet
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('project_id', projectId)
      .order('start_time', { ascending: true })
    
    if (!eventsError) {
      setEvents(eventsData || [])
    }
    
    setLoading(false)
    setIsRefreshing(false)
  }
  
  const createTaskInProject = async () => {
    if (!newTaskTitle || !user) {
      alert('Veuillez remplir le titre')
      return
    }
    
    const { error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: user.id,
          title: newTaskTitle,
          project_id: projectId,
          status: 'todo'
        }
      ])
    
    if (error) {
      console.error('Erreur création tâche:', error)
      alert('Erreur lors de la création')
    } else {
      setNewTaskTitle('')
      setShowTaskForm(false)
      loadProjectData()
    }
  }
  
  const createEventInProject = async () => {
    if (!newEventTitle || !newEventStart || !newEventEnd || !user) {
      alert('Veuillez remplir tous les champs')
      return
    }
    
    const { error } = await supabase
      .from('events')
      .insert([
        {
          user_id: user.id,
          title: newEventTitle,
          start_time: newEventStart,
          end_time: newEventEnd,
          project_id: projectId
        }
      ])
    
    if (error) {
      console.error('Erreur création événement:', error)
      alert('Erreur lors de la création')
    } else {
      setNewEventTitle('')
      setNewEventStart('')
      setNewEventEnd('')
      setShowEventForm(false)
      loadProjectData()
    }
  }
  
  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
    
    if (!error) {
      loadProjectData()
    }
  }
  
  const unlinkTask = async (taskId: string) => {
    if (!confirm('Dissocier cette tâche du projet ?')) return
    
    const { error } = await supabase
      .from('tasks')
      .update({ project_id: null })
      .eq('id', taskId)
    
    if (!error) {
      loadProjectData()
    }
  }
  
  const unlinkEvent = async (eventId: string) => {
    if (!confirm('Dissocier cet événement du projet ?')) return
    
    const { error } = await supabase
      .from('events')
      .update({ project_id: null })
      .eq('id', eventId)
    
    if (!error) {
      loadProjectData()
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" 
               style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}></div>
          <p className="text-xl text-theme-secondary">Chargement...</p>
        </div>
      </div>
    )
  }
  
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <p className="text-xl text-theme-secondary">Projet introuvable</p>
      </div>
    )
  }
  
  const tasksDone = tasks.filter(t => t.status === 'done').length
  const progressPercentage = tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0
  
  return (
    <main className="min-h-screen bg-theme-secondary p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projets"
            className="text-theme-secondary hover:opacity-80 mb-4 inline-block font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            ← Retour aux projets
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-theme-primary mb-2">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-theme-secondary text-lg">
                  {project.description}
                </p>
              )}
            </div>
            
            {isRefreshing && (
              <span className="text-sm text-theme-tertiary flex items-center gap-2">
                <span className="animate-spin">🔄</span>
                Mise à jour...
              </span>
            )}
          </div>
        </div>
        
        {/* Infos projet */}
        <div className="card-theme mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Progression */}
            <div>
              <h3 className="text-sm font-medium text-theme-tertiary mb-2">Progression</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-theme-tertiary rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ 
                        width: `${progressPercentage}%`,
                        backgroundColor: 'var(--color-success)'
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-theme-primary">
                  {progressPercentage}%
                </span>
              </div>
              <p className="text-sm text-theme-secondary mt-1">
                {tasksDone} / {tasks.length} tâches terminées
              </p>
            </div>
            
            {/* Budget */}
            {project.budget_total && (
              <div>
                <h3 className="text-sm font-medium text-theme-tertiary mb-2">Budget</h3>
                <p className="text-2xl font-bold text-theme-primary">
                  {project.budget_spent || 0}€ / {project.budget_total}€
                </p>
                <p className="text-sm text-theme-secondary mt-1">
                  Reste : {(project.budget_total - (project.budget_spent || 0)).toFixed(2)}€
                </p>
              </div>
            )}
            
            {/* Dates */}
            {(project.start_date || project.end_date) && (
              <div>
                <h3 className="text-sm font-medium text-theme-tertiary mb-2">Période</h3>
                {project.start_date && (
                  <p className="text-sm text-theme-secondary">
                    📅 Début : {new Date(project.start_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {project.end_date && (
                  <p className="text-sm text-theme-secondary">
                    🏁 Fin : {new Date(project.end_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            )}
            
            {/* Temps passé */}
            <div>
              <h3 className="text-sm font-medium text-theme-tertiary mb-2">Temps passé</h3>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                  {(() => {
                    const hours = Math.floor((project.time_spent || 0) / 60);
                    const minutes = (project.time_spent || 0) % 60;
                    if (hours === 0 && minutes === 0) return '0h';
                    if (hours === 0) return `${minutes}min`;
                    if (minutes === 0) return `${hours}h`;
                    return `${hours}h ${minutes}min`;
                  })()}
                </span>
              </div>
              <p className="text-sm text-theme-secondary mt-1">
                Sur {events.length} événement{events.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Rapport mensuel */}
        <div className="mb-8">
          <MonthlyReport 
            projectId={projectId} 
            projectName={project.name}
            projectColor={project.color}
          />
        </div>
        
        {/* Section Tâches */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-theme-primary">
              ✅ Tâches du projet ({tasks.length})
            </h2>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="btn-secondary text-sm font-medium"
            >
              {showTaskForm ? '❌ Annuler' : '➕ Ajouter une tâche'}
            </button>
          </div>
          
          {/* Formulaire tâche rapide */}
          {showTaskForm && (
            <div className="bg-theme-primary p-4 rounded-lg mb-4 border-2 border-theme"
                 style={{ borderColor: 'var(--color-secondary)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Titre de la tâche..."
                  className="flex-1 border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ '--tw-ring-color': 'var(--color-secondary)' } as any}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      createTaskInProject()
                    }
                  }}
                />
                <button
                  onClick={createTaskInProject}
                  className="btn-secondary font-medium"
                >
                  Créer
                </button>
              </div>
            </div>
          )}
          
          {/* Liste des tâches */}
          {tasks.length === 0 ? (
            <div className="card-theme text-center py-8">
              <p className="text-theme-secondary">Aucune tâche dans ce projet</p>
              <p className="text-theme-tertiary text-sm mt-2">Ajoutez votre première tâche !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Colonne À faire */}
              <div>
                <h3 className="font-semibold text-theme-secondary mb-3">📝 À faire</h3>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'todo').map(task => (
                    <div key={task.id} className="bg-theme-primary p-3 rounded-lg shadow-sm border border-theme">
                      <p className="font-medium text-theme-primary mb-2">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-theme-tertiary mb-2">
                          📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="flex-1 text-white px-2 py-1 rounded text-xs hover:opacity-80 transition-all"
                          style={{ backgroundColor: 'var(--color-secondary)' }}
                        >
                          ▶️
                        </button>
                        <button
                          onClick={() => unlinkTask(task.id)}
                          className="bg-theme-tertiary text-theme-primary px-2 py-1 rounded text-xs hover:opacity-80 transition-all"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Colonne En cours */}
              <div>
                <h3 className="font-semibold text-theme-secondary mb-3">🚀 En cours</h3>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'in_progress').map(task => (
                    <div key={task.id} className="p-3 rounded-lg shadow-sm border-2"
                         style={{ 
                           backgroundColor: 'var(--color-secondary-light)',
                           borderColor: 'var(--color-secondary)'
                         }}>
                      <p className="font-medium text-theme-primary mb-2">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-theme-tertiary mb-2">
                          📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          className="flex-1 text-white px-2 py-1 rounded text-xs hover:opacity-80 transition-all"
                          style={{ backgroundColor: 'var(--color-success)' }}
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => unlinkTask(task.id)}
                          className="bg-theme-tertiary text-theme-primary px-2 py-1 rounded text-xs hover:opacity-80 transition-all"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Colonne Terminé */}
              <div>
                <h3 className="font-semibold text-theme-secondary mb-3">✅ Terminé</h3>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'done').map(task => (
                    <div key={task.id} className="p-3 rounded-lg shadow-sm border-2 opacity-75"
                         style={{ 
                           backgroundColor: 'var(--color-success-light)',
                           borderColor: 'var(--color-success)'
                         }}>
                      <p className="font-medium text-theme-primary mb-2 line-through">{task.title}</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="flex-1 text-white px-2 py-1 rounded text-xs hover:opacity-80 transition-all"
                          style={{ backgroundColor: 'var(--color-secondary)' }}
                        >
                          ↩️
                        </button>
                        <button
                          onClick={() => unlinkTask(task.id)}
                          className="bg-theme-tertiary text-theme-primary px-2 py-1 rounded text-xs hover:opacity-80 transition-all"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Section Événements */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-theme-primary">
              📅 Événements du projet ({events.length})
            </h2>
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="btn-primary text-sm font-medium"
            >
              {showEventForm ? '❌ Annuler' : '➕ Ajouter un événement'}
            </button>
          </div>
          
          {/* Formulaire événement rapide */}
          {showEventForm && (
            <div className="bg-theme-primary p-4 rounded-lg mb-4 border-2 border-theme"
                 style={{ borderColor: 'var(--color-primary)' }}>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Titre de l'événement..."
                  className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    value={newEventStart}
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  />
                  <input
                    type="datetime-local"
                    value={newEventEnd}
                    onChange={(e) => setNewEventEnd(e.target.value)}
                    className="border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  />
                </div>
                <button
                  onClick={createEventInProject}
                  className="w-full btn-primary font-medium"
                >
                  Créer
                </button>
              </div>
            </div>
          )}
          
          {/* Liste des événements */}
          {events.length === 0 ? (
            <div className="card-theme text-center py-8">
              <p className="text-theme-secondary">Aucun événement dans ce projet</p>
              <p className="text-theme-tertiary text-sm mt-2">Ajoutez votre premier événement !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="card-theme border-l-4"
                     style={{ borderLeftColor: 'var(--color-primary)' }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-theme-primary mb-2">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-theme-secondary mb-2">{event.description}</p>
                      )}
                      <div className="flex gap-4 text-sm text-theme-tertiary">
                        <span>🕐 {new Date(event.start_time).toLocaleString('fr-FR')}</span>
                        <span>→</span>
                        <span>🕑 {new Date(event.end_time).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => unlinkEvent(event.id)}
                      className="bg-theme-tertiary text-theme-primary px-3 py-1 rounded text-sm hover:opacity-80 transition-all"
                      title="Dissocier du projet"
                    >
                      🔗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}