'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TaskTimer from '@/components/TaskTimer';
import { ContactGroup } from '../../lib/types';

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

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
}

interface TaskContact {
  id: string
  task_id: string
  contact_id: string
  contact?: Contact
  role: string
  notified: boolean
}

interface TaskContactGroup {
  id: string
  task_id: string
  group_id: string
  contact_group?: ContactGroup
}

export default function TachesPage() {
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([])
  const [taskContacts, setTaskContacts] = useState<{ [taskId: string]: TaskContact[] }>({})
  const [taskContactGroups, setTaskContactGroups] = useState<{ [taskId: string]: TaskContactGroup[] }>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<Array<{ contact_id: string; role: string }>>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editProjectId, setEditProjectId] = useState('')
  const [editSelectedContacts, setEditSelectedContacts] = useState<Array<{ contact_id: string; role: string }>>([])
  const [editSelectedGroups, setEditSelectedGroups] = useState<string[]>([])
  
  useEffect(() => {
    checkUser()
    loadTasks()
    loadProjects()
    loadContacts()
    loadContactGroups()
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
      // Filtrer les tâches terminées depuis plus de 3 jours
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      
      const filteredTasks = (data || []).filter(task => {
        // Si la tâche n'est pas terminée, on l'affiche
        if (task.status !== 'done') return true
        
        // Si la tâche est terminée, on vérifie la date de mise à jour
        const updatedAt = new Date(task.updated_at || task.created_at)
        return updatedAt > threeDaysAgo
      })
      
      setTasks(filteredTasks)
      if (filteredTasks.length > 0) {
        await loadTaskContacts(filteredTasks.map(t => t.id))
        await loadTaskContactGroups(filteredTasks.map(t => t.id))
      }
    }
    setLoading(false)
    setIsRefreshing(false)
  }

  const loadTaskContacts = async (taskIds: string[]) => {
    if (taskIds.length === 0) return
    
    try {
      const { data, error } = await supabase
        .from('task_contacts')
        .select(`
          *,
          contact:contacts(*)
        `)
        .in('task_id', taskIds)

      if (error) throw error

      const contactsByTask: { [taskId: string]: TaskContact[] } = {}
      ;(data || []).forEach((tc: TaskContact) => {
        if (!contactsByTask[tc.task_id]) {
          contactsByTask[tc.task_id] = []
        }
        contactsByTask[tc.task_id].push(tc)
      })

      setTaskContacts(contactsByTask)
    } catch (error) {
      console.error('Erreur chargement contacts de tâches:', error)
    }
  }

  const loadTaskContactGroups = async (taskIds: string[]) => {
    if (taskIds.length === 0) return
    
    try {
      const { data, error } = await supabase
        .from('task_contact_groups')
        .select(`
          *,
          contact_group:contact_groups(*)
        `)
        .in('task_id', taskIds)

      if (error) throw error

      const groupsByTask: { [taskId: string]: TaskContactGroup[] } = {}
      ;(data || []).forEach((tcg: TaskContactGroup) => {
        if (!groupsByTask[tcg.task_id]) {
          groupsByTask[tcg.task_id] = []
        }
        groupsByTask[tcg.task_id].push(tcg)
      })

      setTaskContactGroups(groupsByTask)
    } catch (error) {
      console.error('Erreur chargement groupes de tâches:', error)
    }
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

  const loadContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('status', 'active')
      .order('last_name', { ascending: true })
    
    if (!error) {
      setContacts(data || [])
    }
  }

  const loadContactGroups = async () => {
    const { data, error } = await supabase
      .from('contact_groups')
      .select('*')
      .order('name', { ascending: true })
    
    if (!error) {
      setContactGroups(data || [])
    }
  }
  
  const createTask = async () => {
    if (!title) {
      alert('Veuillez remplir le titre')
      return
    }
    
    const { data, error } = await supabase
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
      .select()
      .single()
    
    if (error) {
      console.error('Erreur création:', error)
      alert('Erreur lors de la création')
      return
    }

    // Ajouter les contacts
    if (selectedContacts.length > 0) {
      const contactsToInsert = selectedContacts.map(sc => ({
        task_id: data.id,
        contact_id: sc.contact_id,
        role: sc.role,
        notified: false,
      }))

      const { error: contactError } = await supabase
        .from('task_contacts')
        .insert(contactsToInsert)

      if (contactError) {
        console.error('Erreur ajout contacts:', contactError)
      }
    }

    // Ajouter les groupes
    if (selectedGroups.length > 0) {
      const groupsToInsert = selectedGroups.map(groupId => ({
        task_id: data.id,
        group_id: groupId,
      }))

      const { error: groupError } = await supabase
        .from('task_contact_groups')
        .insert(groupsToInsert)

      if (groupError) {
        console.error('Erreur ajout groupes:', groupError)
      }
    }

    setTitle('')
    setDescription('')
    setDueDate('')
    setProjectId('')
    setSelectedContacts([])
    setSelectedGroups([])
    setShowForm(false)
    loadTasks()
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
  
  const startEdit = async (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditDueDate(task.due_date || '')
    setEditProjectId(task.project_id || '')
    setShowForm(false)

    // Charger les contacts de la tâche
    const { data: contactsData, error: contactsError } = await supabase
      .from('task_contacts')
      .select('*')
      .eq('task_id', task.id)

    if (!contactsError && contactsData) {
      setEditSelectedContacts(contactsData.map(tc => ({
        contact_id: tc.contact_id,
        role: tc.role,
      })))
    } else {
      setEditSelectedContacts([])
    }

    // Charger les groupes de la tâche
    const { data: groupsData, error: groupsError } = await supabase
      .from('task_contact_groups')
      .select('*')
      .eq('task_id', task.id)

    if (!groupsError && groupsData) {
      setEditSelectedGroups(groupsData.map(tcg => tcg.group_id))
    } else {
      setEditSelectedGroups([])
    }

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
    setEditSelectedContacts([])
    setEditSelectedGroups([])
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
      return
    }

    // Supprimer les anciens contacts et ajouter les nouveaux
    await supabase
      .from('task_contacts')
      .delete()
      .eq('task_id', editingTask.id)

    if (editSelectedContacts.length > 0) {
      const contactsToInsert = editSelectedContacts.map(sc => ({
        task_id: editingTask.id,
        contact_id: sc.contact_id,
        role: sc.role,
        notified: false,
      }))

      const { error: contactError } = await supabase
        .from('task_contacts')
        .insert(contactsToInsert)

      if (contactError) {
        console.error('Erreur mise à jour contacts:', contactError)
      }
    }

    // Supprimer les anciens groupes et ajouter les nouveaux
    await supabase
      .from('task_contact_groups')
      .delete()
      .eq('task_id', editingTask.id)

    if (editSelectedGroups.length > 0) {
      const groupsToInsert = editSelectedGroups.map(groupId => ({
        task_id: editingTask.id,
        group_id: groupId,
      }))

      const { error: groupError } = await supabase
        .from('task_contact_groups')
        .insert(groupsToInsert)

      if (groupError) {
        console.error('Erreur mise à jour groupes:', groupError)
      }
    }

    cancelEdit()
    loadTasks()
  }
  
  const getProjectName = (projectId?: string) => {
    if (!projectId) return null
    const project = projects.find(p => p.id === projectId)
    return project
  }

  const addContact = (isEdit: boolean = false) => {
    if (contacts.length === 0) {
      alert('Aucun contact disponible. Créez d\'abord des contacts.')
      return
    }
    const newContact = { contact_id: contacts[0].id, role: 'assigned' }
    if (isEdit) {
      setEditSelectedContacts([...editSelectedContacts, newContact])
    } else {
      setSelectedContacts([...selectedContacts, newContact])
    }
  }

  const removeContact = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditSelectedContacts(editSelectedContacts.filter((_, i) => i !== index))
    } else {
      setSelectedContacts(selectedContacts.filter((_, i) => i !== index))
    }
  }

  const updateContactRole = (index: number, role: string, isEdit: boolean = false) => {
    if (isEdit) {
      const updated = [...editSelectedContacts]
      updated[index].role = role
      setEditSelectedContacts(updated)
    } else {
      const updated = [...selectedContacts]
      updated[index].role = role
      setSelectedContacts(updated)
    }
  }

  const updateContactId = (index: number, contactId: string, isEdit: boolean = false) => {
    if (isEdit) {
      const updated = [...editSelectedContacts]
      updated[index].contact_id = contactId
      setEditSelectedContacts(updated)
    } else {
      const updated = [...selectedContacts]
      updated[index].contact_id = contactId
      setSelectedContacts(updated)
    }
  }

  const toggleGroup = (groupId: string, isEdit: boolean = false) => {
    if (isEdit) {
      if (editSelectedGroups.includes(groupId)) {
        setEditSelectedGroups(editSelectedGroups.filter(id => id !== groupId))
      } else {
        setEditSelectedGroups([...editSelectedGroups, groupId])
      }
    } else {
      if (selectedGroups.includes(groupId)) {
        setSelectedGroups(selectedGroups.filter(id => id !== groupId))
      } else {
        setSelectedGroups([...selectedGroups, groupId])
      }
    }
  }

  const roleLabels: { [key: string]: string } = {
    assigned: 'Assigné',
    reviewer: 'Reviewer',
    observer: 'Observateur',
  }

  const roleColors: { [key: string]: string } = {
    assigned: '#3b82f6',
    reviewer: '#f59e0b',
    observer: '#6b7280',
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

  const TaskCard = ({ task }: { task: Task }) => {
    const project = getProjectName(task.project_id)
    const taskContactsList = taskContacts[task.id] || []
    const taskGroupsList = taskContactGroups[task.id] || []

    return (
      <div
        className="p-4 rounded-lg border hover:shadow-md transition-shadow"
        style={{
          backgroundColor: task.status === 'in_progress' ? 'var(--color-primary-light)' : 
                          task.status === 'done' ? 'var(--color-success)20' : 'var(--color-bg-secondary)',
          borderColor: task.status === 'in_progress' ? 'var(--color-primary)' : 
                      task.status === 'done' ? 'var(--color-success)40' : 'var(--color-border)',
          opacity: task.status === 'done' ? 0.75 : 1
        }}
      >
        <h3 
          className={`font-semibold mb-2 ${task.status === 'done' ? 'line-through' : ''}`}
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

        {/* Contacts assignés */}
        {taskContactsList.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {taskContactsList.map((tc) => (
              <div
                key={tc.id}
                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: `${roleColors[tc.role]}20`,
                  color: roleColors[tc.role],
                }}
              >
                <span>👤</span>
                <span>{tc.contact?.first_name} {tc.contact?.last_name}</span>
                <span className="opacity-60">({roleLabels[tc.role]})</span>
              </div>
            ))}
          </div>
        )}

        {/* Groupes participants */}
        {taskGroupsList.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {taskGroupsList.map((tcg) => (
              <div
                key={tcg.id}
                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: `${tcg.contact_group?.color}20`,
                  color: tcg.contact_group?.color,
                }}
              >
                <span>🏢</span>
                <span>{tcg.contact_group?.name}</span>
              </div>
            ))}
          </div>
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
              className="text-xs px-2 py-1 rounded-full text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: project.color || '#8b5cf6' }}
            >
              📁 {project.name}
            </span>
          </Link>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={() => startEdit(task)}
            className="text-white px-3 py-1 rounded text-sm hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--color-text-tertiary)' }}
          >
            ✏️
          </button>
          
          {task.status === 'todo' && (
            <button
              onClick={() => updateTaskStatus(task.id, 'in_progress')}
              className="btn-primary flex-1 text-sm"
            >
              ▶️ Commencer
            </button>
          )}
          
          {task.status === 'in_progress' && (
            <>
              <button
                onClick={() => updateTaskStatus(task.id, 'todo')}
                className="text-white px-3 py-1 rounded text-sm hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--color-text-tertiary)' }}
              >
                ⬅️
              </button>
              <button
                onClick={() => updateTaskStatus(task.id, 'done')}
                className="flex-1 text-white px-3 py-1 rounded text-sm hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--color-success)' }}
              >
                ✅ Terminer
              </button>
            </>
          )}
          
          {task.status === 'done' && (
            <button
              onClick={() => updateTaskStatus(task.id, 'in_progress')}
              className="btn-primary flex-1 text-sm"
            >
              ↩️ Reprendre
            </button>
          )}
          
          <button
            onClick={() => deleteTask(task.id)}
            className="text-white px-3 py-1 rounded text-sm hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--color-error)' }}
          >
            🗑️
          </button>
        </div>
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
                className="font-bold text-xl hover:opacity-70"
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

              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label 
                    className="block text-sm font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    👥 Contacts assignés
                  </label>
                  <button
                    type="button"
                    onClick={() => addContact(true)}
                    className="text-sm px-3 py-1 rounded hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                    }}
                  >
                    + Ajouter
                  </button>
                </div>

                {editSelectedContacts.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucun contact assigné
                  </p>
                ) : (
                  <div className="space-y-2">
                    {editSelectedContacts.map((sc, index) => (
                      <div
                        key={index}
                        className="flex gap-2 items-center p-2 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-bg-primary)',
                        }}
                      >
                        <select
                          value={sc.contact_id}
                          onChange={(e) => updateContactId(index, e.target.value, true)}
                          className="flex-1 px-3 py-1 rounded border text-sm"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          {contacts.map(contact => (
                            <option key={contact.id} value={contact.id}>
                              {contact.first_name} {contact.last_name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={sc.role}
                          onChange={(e) => updateContactRole(index, e.target.value, true)}
                          className="px-3 py-1 rounded border text-sm"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          <option value="assigned">Assigné</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="observer">Observateur</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeContact(index, true)}
                          className="p-1 rounded text-sm hover:opacity-80"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-error)',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Groupes */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  🏢 Groupes participants
                </label>

                {contactGroups.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucun groupe disponible
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contactGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: editSelectedGroups.includes(group.id)
                            ? `${group.color}20`
                            : 'var(--color-bg-primary)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editSelectedGroups.includes(group.id)}
                          onChange={() => toggleGroup(group.id, true)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {group.name}
                          </div>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                      </label>
                    ))}
                  </div>
                )}
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
                  className="px-6 py-3 rounded-lg font-semibold hover:opacity-80"
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

              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label 
                    className="block text-sm font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    👥 Contacts assignés
                  </label>
                  <button
                    type="button"
                    onClick={() => addContact(false)}
                    className="text-sm px-3 py-1 rounded hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    + Ajouter
                  </button>
                </div>

                {selectedContacts.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucun contact assigné
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedContacts.map((sc, index) => (
                      <div
                        key={index}
                        className="flex gap-2 items-center p-2 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                        }}
                      >
                        <select
                          value={sc.contact_id}
                          onChange={(e) => updateContactId(index, e.target.value, false)}
                          className="flex-1 px-3 py-1 rounded border text-sm"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          {contacts.map(contact => (
                            <option key={contact.id} value={contact.id}>
                              {contact.first_name} {contact.last_name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={sc.role}
                          onChange={(e) => updateContactRole(index, e.target.value, false)}
                          className="px-3 py-1 rounded border text-sm"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          <option value="assigned">Assigné</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="observer">Observateur</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeContact(index, false)}
                          className="p-1 rounded text-sm hover:opacity-80"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-error)',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Groupes */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  🏢 Groupes participants
                </label>

                {contactGroups.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucun groupe disponible
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contactGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: selectedGroups.includes(group.id)
                            ? `${group.color}20`
                            : 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.id)}
                          onChange={() => toggleGroup(group.id, false)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {group.name}
                          </div>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                      </label>
                    ))}
                  </div>
                )}
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
                todoTasks.map(task => <TaskCard key={task.id} task={task} />)
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
                inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
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

            <p 
              className="text-xs mb-4 text-center"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              ℹ️ Les tâches terminées depuis plus de 3 jours sont masquées
            </p>
            
            <div className="space-y-3">
              {doneTasks.length === 0 ? (
                <p 
                  className="text-center py-8"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Aucune tâche
                </p>
              ) : (
                doneTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}