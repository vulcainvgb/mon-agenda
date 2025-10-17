'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProjectTimeDisplay from '@/components/ProjectTimeDisplay';

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
  status: 'todo' | 'in_progress' | 'done'
}

interface Event {
  id: string
}

export default function ProjetsPage() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()
  
  // Formulaire création
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#8b5cf6')
  const [budgetTotal, setBudgetTotal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // États pour l'édition
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editBudgetTotal, setEditBudgetTotal] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  
  // Stats par projet (nombre de tâches/événements)
  const [projectStats, setProjectStats] = useState<{[key: string]: {tasks: number, events: number, tasksDone: number}}>({})
  
  useEffect(() => {
    checkUser()
    loadProjects()
  }, [])
  
  // Polling
  useEffect(() => {
    if (!user) return
    
    const interval = setInterval(() => {
      loadProjects()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [user])
  
  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUser(data.user)
    } else {
      router.push('/login')
    }
  }
  
  const loadProjects = async () => {
    setIsRefreshing(true)
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erreur chargement:', error)
    } else {
      setProjects(data || [])
      // Charger les stats pour chaque projet
      loadProjectStats(data || [])
    }
    
    setLoading(false)
    setIsRefreshing(false)
  }
  
  const loadProjectStats = async (projectsList: Project[]) => {
    const stats: {[key: string]: {tasks: number, events: number, tasksDone: number}} = {}
    
    for (const project of projectsList) {
      // Compter les tâches
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('project_id', project.id)
      
      // Compter les événements
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('project_id', project.id)
      
      stats[project.id] = {
        tasks: tasks?.length || 0,
        tasksDone: tasks?.filter((t: Task) => t.status === 'done').length || 0,
        events: events?.length || 0
      }
    }
    
    setProjectStats(stats)
  }
  
  const createProject = async () => {
    if (!name) {
      alert('Veuillez remplir le nom du projet')
      return
    }
    
    const { error } = await supabase
      .from('projects')
      .insert([
        {
          user_id: user.id,
          name,
          description,
          color,
          budget_total: budgetTotal ? parseFloat(budgetTotal) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          status: 'active'
        }
      ])
    
    if (error) {
      console.error('Erreur création:', error)
      alert('Erreur lors de la création')
    } else {
      setName('')
      setDescription('')
      setColor('#8b5cf6')
      setBudgetTotal('')
      setStartDate('')
      setEndDate('')
      setShowForm(false)
      loadProjects()
    }
  }
  
  const startEdit = (project: Project) => {
    setEditingProject(project)
    setEditName(project.name)
    setEditDescription(project.description || '')
    setEditColor(project.color || '#8b5cf6')
    setEditBudgetTotal(project.budget_total?.toString() || '')
    setEditStartDate(project.start_date || '')
    setEditEndDate(project.end_date || '')
    setShowForm(false)
    
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }
  
  const cancelEdit = () => {
    setEditingProject(null)
    setEditName('')
    setEditDescription('')
    setEditColor('')
    setEditBudgetTotal('')
    setEditStartDate('')
    setEditEndDate('')
  }
  
  const saveEdit = async () => {
    if (!editName || !editingProject) {
      alert('Veuillez remplir le nom')
      return
    }
    
    const { error } = await supabase
      .from('projects')
      .update({
        name: editName,
        description: editDescription,
        color: editColor,
        budget_total: editBudgetTotal ? parseFloat(editBudgetTotal) : null,
        start_date: editStartDate || null,
        end_date: editEndDate || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingProject.id)
    
    if (error) {
      console.error('Erreur mise à jour:', error)
      alert('Erreur lors de la mise à jour')
    } else {
      cancelEdit()
      loadProjects()
    }
  }
  
  const updateStatus = async (projectId: string, newStatus: 'active' | 'archived' | 'completed') => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', projectId)
    
    if (error) {
      console.error('Erreur mise à jour:', error)
    } else {
      loadProjects()
    }
  }
  
  const deleteProject = async (id: string) => {
    if (!confirm('Supprimer ce projet ? Les tâches et événements liés ne seront pas supprimés, juste dissociés.')) return
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erreur suppression:', error)
    } else {
      loadProjects()
    }
  }
  
  const getProgressPercentage = (projectId: string) => {
    const stats = projectStats[projectId]
    if (!stats || stats.tasks === 0) return 0
    return Math.round((stats.tasksDone / stats.tasks) * 100)
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
  
  const activeProjects = projects.filter(p => p.status === 'active')
  const completedProjects = projects.filter(p => p.status === 'completed')
  const archivedProjects = projects.filter(p => p.status === 'archived')
  
  return (
    <main className="min-h-screen bg-theme-secondary p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-theme-primary">
              📁 Mes Projets
            </h1>
            
            {isRefreshing && (
              <span className="text-sm text-theme-tertiary flex items-center gap-2">
                <span className="animate-spin">🔄</span>
                Mise à jour...
              </span>
            )}
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? '❌ Annuler' : '➕ Nouveau projet'}
          </button>
        </div>
        
        {/* Formulaire d'édition */}
        {editingProject && (
          <div className="bg-theme-primary border-2 border-theme p-6 rounded-xl mb-8 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-theme-primary">
                ✏️ Modifier le projet
              </h2>
              <button onClick={cancelEdit} className="text-theme-tertiary hover:text-theme-secondary font-bold text-xl">
                ❌
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Nom du projet *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Couleur</label>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-full h-10 border border-theme rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Budget total (€)</label>
                  <input
                    type="number"
                    value={editBudgetTotal}
                    onChange={(e) => setEditBudgetTotal(e.target.value)}
                    placeholder="5000"
                    className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Date de début</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Date de fin</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="flex-1 btn-primary"
                >
                  💾 Enregistrer
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-theme-tertiary text-theme-primary px-6 py-3 rounded-lg hover:opacity-80 transition-all font-semibold"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Formulaire de création */}
        {showForm && (
          <div className="bg-theme-primary p-6 rounded-xl mb-8 shadow-md border border-theme">
            <h2 className="text-xl font-semibold text-theme-primary mb-4">
              Créer un projet
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Nom du projet *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rénovation cuisine, Mariage, Lancement produit..."
                  className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectifs et détails du projet..."
                  className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Couleur</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 border border-theme rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Budget total (€)</label>
                  <input
                    type="number"
                    value={budgetTotal}
                    onChange={(e) => setBudgetTotal(e.target.value)}
                    placeholder="5000"
                    className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Date de début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Date de fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-theme rounded-lg px-4 py-2 bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
                  />
                </div>
              </div>
              
              <button
                onClick={createProject}
                className="w-full btn-primary"
              >
                ✨ Créer le projet
              </button>
            </div>
          </div>
        )}
        
        {/* Liste des projets actifs */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-theme-primary mb-4">
            🚀 Projets actifs ({activeProjects.length})
          </h2>
          
          {activeProjects.length === 0 ? (
            <div className="bg-theme-primary p-8 rounded-xl text-center shadow-md border border-theme">
              <p className="text-theme-secondary text-lg">📭 Aucun projet actif</p>
              <p className="text-theme-tertiary text-sm mt-2">Créez votre premier projet !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProjects.map((project) => {
                const progress = getProgressPercentage(project.id)
                const stats = projectStats[project.id] || { tasks: 0, events: 0, tasksDone: 0 }
                
                return (
                  <div
                    key={project.id}
                    className="card-theme border-l-4"
                    style={{ borderLeftColor: project.color }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-theme-primary">
                        {project.name}
                      </h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(project)}
                          className="text-theme-tertiary hover:text-theme-secondary transition-colors"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                    
                    {project.description && (
                      <p className="text-theme-secondary text-sm mb-4">
                        {project.description}
                      </p>
                    )}
                    
                    {/* Progression */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-theme-secondary mb-2">
                        <span>Progression</span>
                        <span className="font-semibold">{progress}%</span>
                      </div>
                      <div className="w-full bg-theme-tertiary rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${progress}%`,
                            backgroundColor: 'var(--color-success)'
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex flex-wrap gap-3 text-sm text-theme-secondary mb-4">
                      <span>✅ {stats.tasksDone}/{stats.tasks} tâches</span>
                      <span>📅 {stats.events} événements</span>
                      {/* Affichage du temps passé */}
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
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
                    </div>
                    
                    {/* Budget */}
                    {project.budget_total && (
                      <div className="text-sm text-theme-secondary mb-4">
                        💰 Budget : {project.budget_spent || 0}€ / {project.budget_total}€
                      </div>
                    )}
                    
                    {/* Dates */}
                    {(project.start_date || project.end_date) && (
                      <div className="text-xs text-theme-tertiary mb-4">
                        {project.start_date && `📅 Début : ${new Date(project.start_date).toLocaleDateString('fr-FR')}`}
                        {project.start_date && project.end_date && ' • '}
                        {project.end_date && `Fin : ${new Date(project.end_date).toLocaleDateString('fr-FR')}`}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/projets/${project.id}`}
                        className="flex-1 btn-primary text-center text-sm font-medium"
                      >
                        👁️ Voir détails
                      </Link>
                      <button
                        onClick={() => updateStatus(project.id, 'completed')}
                        className="px-4 py-2 rounded-lg transition-all text-sm text-white"
                        style={{ backgroundColor: 'var(--color-success)' }}
                        title="Marquer comme terminé"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="px-4 py-2 rounded-lg transition-all text-sm text-white"
                        style={{ backgroundColor: 'var(--color-danger)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Projets terminés */}
        {completedProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">
              ✅ Projets terminés ({completedProjects.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedProjects.map((project) => (
                <div
                  key={project.id}
                  className="card-theme opacity-75"
                  style={{ 
                    backgroundColor: 'var(--color-success-light)',
                    borderColor: 'var(--color-success)'
                  }}
                >
                  <h3 className="text-xl font-bold text-theme-primary mb-2 line-through">
                    {project.name}
                  </h3>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => updateStatus(project.id, 'active')}
                      className="flex-1 btn-secondary text-sm"
                    >
                      ↩️ Réactiver
                    </button>
                    <button
                      onClick={() => updateStatus(project.id, 'archived')}
                      className="bg-theme-tertiary text-theme-primary px-4 py-2 rounded-lg hover:opacity-80 transition-all text-sm"
                    >
                      📦 Archiver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}