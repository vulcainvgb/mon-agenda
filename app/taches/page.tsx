'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TaskTimer from '@/components/TaskTimer';

interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: number
  due_date?: string
  project_id?: string
  created_at?: string
  updated_at?: string
}

interface Project {
  id: string
  name: string
  color?: string
}

export default function TachesPage() {
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editProjectId, setEditProjectId] = useState('')
  
  useEffect(() => {
    checkUser()
    loadTasks()
    loadProjects()
  }, [])
  
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      loadTasks()
    }, 3000)
    return () => {
      clearInterval(interval)
    }
  }, [user])
  
  const updateTaskTime = async (taskId: string, newTimeMinutes: number) => {
    const { error } = await supabase
      .from('tasks')
      .update({ 
        time_spent: newTimeMinutes,
        started_at: null
      })
      .eq('id', taskId);
    
    if (error) {
      console.error('Erreur mise à jour temps:', error);
      alert('Erreur lors de la mise à jour du temps');
    } else {
      loadTasks();
    }
  };

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUser(data.user)
    } else {
      router.push('/login')
    }
  }
  
  const loadTasks = async () => {
    setIsRefreshing(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erreur chargement:', error)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
    setIsRefreshing(false)
  }
  
  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, color')
      .eq('status', 'active')
      .order('name', { ascending: true })
    
    if (!error) {
      setProjects(data || [])
    }
  }
  
  const createTask = async () => {
    if (!title) {
      alert('Veuillez remplir le titre')
      return
    }
    
    const { error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: user.id,
          title,
          description,
          due_date: dueDate || null,
          project_id: projectId || null,
          status: 'todo'
        }
      ])
    
    if (error) {
      console.error('Erreur création:', error)
      alert('Erreur lors de la création')
    } else {
      setTitle('')
      setDescription('')
      setDueDate('')
      setProjectId('')
      setShowForm(false)
      loadTasks()
    }
  }
  
  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId)
    
    if (error) {
      console.error('Erreur mise à jour:', error)
    } else {
      loadTasks()
    }
  }
  
  const deleteTask = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erreur suppression:', error)
    } else {
      loadTasks()
    }
  }
  
  const startEdit = (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditDueDate(task.due_date || '')
    setEditProjectId(task.project_id || '')
    setShowForm(false)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }
  
  const cancelEdit = () => {
    setEditingTask(null)
    setEditTitle('')
    setEditDescription('')
    setEditDueDate('')
    setEditProjectId('')
  }
  
  const saveEdit = async () => {
    if (!editTitle || !editingTask) {
      alert('Veuillez remplir le titre')
      return
    }
    
    const { error } = await supabase
      .from('tasks')
      .update({
        title: editTitle,
        description: editDescription,
        due_date: editDueDate || null,
        project_id: editProjectId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingTask.id)
    
    if (error) {
      console.error('Erreur mise à jour:', error)
      alert('Erreur lors de la mise à jour')
    } else {
      cancelEdit()
      loadTasks()
    }
  }
  
  const getProjectName = (projectId?: string) => {
    if (!projectId) return null
    const project = projects.find(p => p.id === projectId)
    return project
  }
  
  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')
  
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <p 
          className="text-xl"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ⏳ Chargement...
        </p>
      </div>
    )
  }
  
  return (
    <main 
      className="min-h-screen p-8"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 
              className="text-3xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              ✅ Mes Tâches
            </h1>
            
            {isRefreshing && (
              <span 
                className="text-sm flex items-center gap-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span className="animate-spin">🔄</span>
                Mise à jour...
              </span>
            )}
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary font-medium"
          >
            {showForm ? '❌ Annuler' : '➕ Nouvelle tâche'}
          </button>
        </div>
        
        {/* Formulaire d'édition */}
        {editingTask && (
          <div 
            className="border-2 p-6 rounded-xl mb-8 shadow-md"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              borderColor: 'var(--color-primary)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 
                className="text-xl font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                ✏️ Modifier la tâche
              </h2>
              <button
                onClick={cancelEdit}
                className="font-bold text-xl"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ❌
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Titre *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg px-4 py-2 border"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)'
                  }}
                />
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-lg px-4 py-2 border"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)'
                  }}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 border"
                    style={{ 
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-bg-primary)'
                    }}
                  />
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Projet
                  </label>
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 border"
                    style={{ 
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-bg-primary)'
                    }}
                  >
                    <option value="">Aucun projet</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="btn-primary flex-1 font-semibold"
                >
                  💾 Enregistrer les modifications
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-6 py-3 rounded-lg font-semibold"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Formulaire de création */}
        {showForm && (
          <div 
            className="p-6 rounded-xl mb-8 shadow-md border"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ color: 'var(--color-primary)' }}
            >
              Créer une tâche
            </h2>
            
            <div className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Appeler le client, Faire les courses..."
                  className="w-full border rounded-lg px-4 py-2"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)'
                  }}
                />
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails de la tâche..."
                  className="w-full border rounded-lg px-4 py-2"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)'
                  }}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2"
                    style={{ 
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-bg-primary)'
                    }}
                  />
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Projet
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2"
                    style={{ 
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-bg-primary)'
                    }}
                  >
                    <option value="">Aucun projet</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={createTask}
                className="btn-primary w-full font-semibold"
              >
                ✨ Créer la tâche
              </button>
            </div>
          </div>
        )}
        
        {/* Kanban : 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonne À FAIRE */}
          <div 
            className="rounded-xl p-6 shadow-md border"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                📝 À faire
              </h2>
              <span 
                className="px-3 py-1 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {todoTasks.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {todoTasks.length === 0 ? (
                <p 
                  className="text-center py-8"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Aucune tâche
                </p>
              ) : (
                todoTasks.map(task => {
                  const project = getProjectName(task.project_id)
                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <h3 
                        className="font-semibold mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p 
                          className="text-sm mb-3"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {task.description}
                        </p>
                      )}
                      
                      {task.due_date && (
                        <p 
                          className="text-xs mb-2"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          📅 Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}

                      <TaskTimer 
                        task={task} 
                        onUpdateTime={updateTaskTime}
                        className="mb-2"
                      />
                      
                      {project && (
                        <Link
                          href={`/projets/${project.id}`}
                          className="inline-block mb-3"
                        >
                          <span
                            className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: project.color || '#8b5cf6' }}
                          >
                            📁 {project.name}
                          </span>
                        </Link>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(task)}
                          className="text-white px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: 'var(--color-text-tertiary)' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="btn-primary flex-1 text-sm"
                        >
                          ▶️ Commencer
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-white px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: 'var(--color-error)' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          
          {/* Colonne EN COURS */}
          <div 
            className="rounded-xl p-6 shadow-md border"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                🚀 En cours
              </h2>
              <span 
                className="px-3 py-1 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)'
                }}
              >
                {inProgressTasks.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {inProgressTasks.length === 0 ? (
                <p 
                  className="text-center py-8"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Aucune tâche
                </p>
              ) : (
                inProgressTasks.map(task => {
                  const project = getProjectName(task.project_id)
                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                      style={{
                        backgroundColor: 'var(--color-primary-light)',
                        borderColor: 'var(--color-primary)'
                      }}
                    >
                      <h3 
                        className="font-semibold mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p 
                          className="text-sm mb-3"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {task.description}
                        </p>
                      )}
                      
                      {task.due_date && (
                        <p 
                          className="text-xs mb-2"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          📅 Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}

                      <TaskTimer 
                        task={task} 
                        onUpdateTime={updateTaskTime}
                        className="mb-2"
                      />
                      
                      {project && (
                        <Link
                          href={`/projets/${project.id}`}
                          className="inline-block mb-3"
                        >
                          <span
                            className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: project.color || '#8b5cf6' }}
                          >
                            📁 {project.name}
                          </span>
                        </Link>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(task)}
                          className="text-white px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: 'var(--color-text-tertiary)' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'todo')}
                          className="text-white px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: 'var(--color-text-tertiary)' }}
                        >
                          ⬅️
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          className="flex-1 text-white px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: 'var(--color-success)' }}
                        >
                          ✅ Terminer
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-white px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: 'var(--color-error)' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          
          {/* Colonne TERMINÉ */}
          <div 
            className="rounded-xl p-6 shadow-md border"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                ✅ Terminé
              </h2>
              <span 
                className="px-3 py-1 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--color-success)20',
                  color: 'var(--color-success)'
                }}
              >
                {doneTasks.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {doneTasks.length === 0 ? (
                <p 
                  className="text-center py-8"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Aucune tâche
                </p>
              ) : (
                doneTasks.map(task => {
                  const project = getProjectName(task.project_id)
                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border hover:shadow-md transition-shadow opacity-75"
                      style={{
                        backgroundColor: 'var(--color-success)20',
                        borderColor: 'var(--color-success)40'
                      }}
                    >
                      <h3 
                        className="font-semibold mb-2 line-through"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p 
                          className="text-sm mb-3"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {task.description}
                        </p>
                      )}
                      
                      {task.due_date && (
                        <p 
                          className="text-xs mb-2"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          📅 Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}

                      <TaskTimer 
                        task={task} 
                        onUpdateTime={updateTaskTime}
                        className="mb-2"
                      />
                      
                      {project && (
                        <Link
                          href={`/projets/${project.id}`}
                          className="inline-block mb-3"
                        >
                          <span
                            className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: project.color || '#8b5cf6' }}
                          >
                            📁 {project.name}
                          </span>
                        </Link>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="btn-primary flex-1 text-sm"
                        >
                          ↩️ Reprendre
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-white px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: 'var(--color-error)' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}