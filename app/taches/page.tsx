'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  
  // Formulaire création
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  
  // États pour l'édition
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
  
  // Polling
  useEffect(() => {
    if (!user) return
    
    const interval = setInterval(() => {
      loadTasks()
    }, 3000)
    
    return () => {
      clearInterval(interval)
    }
  }, [user])
  
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
  
  // Filtrer les tâches par statut
  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">⏳ Chargement...</p>
      </div>
    )
  }
  
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-purple-900">
              ✅ Mes Tâches
            </h1>
            
            {isRefreshing && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <span className="animate-spin">🔄</span>
                Mise à jour...
              </span>
            )}
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            {showForm ? '❌ Annuler' : '➕ Nouvelle tâche'}
          </button>
        </div>
        
        {/* Formulaire d'édition */}
        {editingTask && (
          <div className="bg-blue-50 border-2 border-blue-300 p-6 rounded-xl mb-8 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-900">
                ✏️ Modifier la tâche
              </h2>
              <button
                onClick={cancelEdit}
                className="text-gray-500 hover:text-gray-700 font-bold text-xl"
              >
                ❌
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Projet
                  </label>
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
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
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  💾 Enregistrer les modifications
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Formulaire de création */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl mb-8 shadow-md">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">
              Créer une tâche
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Appeler le client, Faire les courses..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails de la tâche..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Projet
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
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
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                ✨ Créer la tâche
              </button>
            </div>
          </div>
        )}
        
        {/* Kanban : 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonne À FAIRE */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                📝 À faire
              </h2>
              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                {todoTasks.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {todoTasks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucune tâche</p>
              ) : (
                todoTasks.map(task => {
                  const project = getProjectName(task.project_id)
                  return (
                    <div
                      key={task.id}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {task.description}
                        </p>
                      )}
                      
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mb-2">
                          📅 Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      
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
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="flex-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          ▶️ Commencer
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
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
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                🚀 En cours
              </h2>
              <span className="bg-blue-200 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                {inProgressTasks.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {inProgressTasks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucune tâche</p>
              ) : (
                inProgressTasks.map(task => {
                  const project = getProjectName(task.project_id)
                  return (
                    <div
                      key={task.id}
                      className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {task.description}
                        </p>
                      )}
                      
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mb-2">
                          📅 Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      
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
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'todo')}
                          className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500"
                        >
                          ⬅️
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          className="flex-1 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        >
                          ✅ Terminer
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
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
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                ✅ Terminé
              </h2>
              <span className="bg-green-200 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                {doneTasks.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {doneTasks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucune tâche</p>
              ) : (
                doneTasks.map(task => {
                  const project = getProjectName(task.project_id)
                  return (
                    <div
                      key={task.id}
                      className="bg-green-50 p-4 rounded-lg border border-green-200 hover:shadow-md transition-shadow opacity-75"
                    >
                      <h3 className="font-semibold text-gray-800 mb-2 line-through">
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {task.description}
                        </p>
                      )}
                      
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mb-2">
                          📅 Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      
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
                          className="flex-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          ↩️ Reprendre
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
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