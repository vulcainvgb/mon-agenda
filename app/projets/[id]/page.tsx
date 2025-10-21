'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import MonthlyReport from '../../../components/MonthlyReport'
import { ContactGroup } from '../../../lib/types'

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

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company?: string
}

interface ProjectContact {
  id: string
  project_id: string
  contact_id: string
  role: string
  contact?: Contact
}

interface ProjectContactGroup {
  id: string
  project_id: string
  group_id: string
  contact_group?: ContactGroup
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [projectContacts, setProjectContacts] = useState<ProjectContact[]>([])
  const [projectContactGroups, setProjectContactGroups] = useState<ProjectContactGroup[]>([])
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
  
  // Gestion de l'équipe
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Array<{ contact_id: string; role: string }>>([])
  
  // Gestion des groupes
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [allContactGroups, setAllContactGroups] = useState<ContactGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  
  useEffect(() => {
    checkUser()
    loadProjectData()
    loadAllContacts()
    loadAllContactGroups()
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

    // Charger les contacts du projet
    const { data: contactsData, error: contactsError } = await supabase
      .from('project_contacts')
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('project_id', projectId)

    if (!contactsError) {
      setProjectContacts(contactsData || [])
    }

    // Charger les groupes du projet
    const { data: groupsData, error: groupsError } = await supabase
      .from('project_contact_groups')
      .select(`
        *,
        contact_group:contact_groups(*)
      `)
      .eq('project_id', projectId)

    if (!groupsError) {
      setProjectContactGroups(groupsData || [])
    }
    
    setLoading(false)
    setIsRefreshing(false)
  }

  const loadAllContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('status', 'active')
      .order('last_name', { ascending: true })
    
    if (!error) {
      setAllContacts(data || [])
    }
  }

  const loadAllContactGroups = async () => {
    const { data, error } = await supabase
      .from('contact_groups')
      .select('*')
      .order('name', { ascending: true })
    
    if (!error) {
      setAllContactGroups(data || [])
    }
  }

  const openTeamModal = () => {
    // Initialiser avec les contacts actuels du projet
    setSelectedContacts(
      projectContacts.map(pc => ({
        contact_id: pc.contact_id,
        role: pc.role
      }))
    )
    setShowTeamModal(true)
  }

  const openGroupsModal = () => {
    // Initialiser avec les groupes actuels du projet
    setSelectedGroups(projectContactGroups.map(pcg => pcg.group_id))
    setShowGroupsModal(true)
  }

  const saveTeam = async () => {
    if (!project) return

    // Filtrer les contacts valides (avec un contact_id rempli)
    const validContacts = selectedContacts.filter(sc => sc.contact_id && sc.contact_id.trim() !== '')

    // Supprimer tous les contacts actuels
    await supabase
      .from('project_contacts')
      .delete()
      .eq('project_id', projectId)

    // Ajouter les nouveaux contacts valides
    if (validContacts.length > 0) {
      const contactsToInsert = validContacts.map(sc => ({
        project_id: projectId,
        contact_id: sc.contact_id,
        role: sc.role,
      }))

      const { error } = await supabase
        .from('project_contacts')
        .insert(contactsToInsert)

      if (error) {
        console.error('Erreur sauvegarde équipe:', error)
        alert('Erreur lors de la sauvegarde de l\'équipe: ' + error.message)
        return
      }
    }

    setShowTeamModal(false)
    loadProjectData()
  }

  const saveGroups = async () => {
    if (!project) return

    // Supprimer tous les groupes actuels
    await supabase
      .from('project_contact_groups')
      .delete()
      .eq('project_id', projectId)

    // Ajouter les nouveaux groupes
    if (selectedGroups.length > 0) {
      const groupsToInsert = selectedGroups.map(groupId => ({
        project_id: projectId,
        group_id: groupId,
      }))

      const { error } = await supabase
        .from('project_contact_groups')
        .insert(groupsToInsert)

      if (error) {
        console.error('Erreur sauvegarde groupes:', error)
        alert('Erreur lors de la sauvegarde des groupes: ' + error.message)
        return
      }
    }

    setShowGroupsModal(false)
    loadProjectData()
  }

  const addContact = () => {
    if (allContacts.length === 0) {
      alert('Aucun contact disponible. Veuillez d\'abord créer des contacts.')
      return
    }
    // Trouver le premier contact non sélectionné
    const availableContact = allContacts.find(
      c => !selectedContacts.some(sc => sc.contact_id === c.id)
    )
    if (!availableContact) {
      alert('Tous les contacts sont déjà ajoutés à l\'équipe')
      return
    }
    setSelectedContacts([...selectedContacts, { contact_id: availableContact.id, role: 'member' }])
  }

  const removeContact = (index: number) => {
    setSelectedContacts(selectedContacts.filter((_, i) => i !== index))
  }

  const updateContactRole = (index: number, role: string) => {
    const updated = [...selectedContacts]
    updated[index].role = role
    setSelectedContacts(updated)
  }

  const updateContactId = (index: number, contactId: string) => {
    const updated = [...selectedContacts]
    updated[index].contact_id = contactId
    setSelectedContacts(updated)
  }

  const toggleGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId))
    } else {
      setSelectedGroups([...selectedGroups, groupId])
    }
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

  const roleLabels: { [key: string]: string } = {
    manager: 'Chef de projet',
    member: 'Membre',
    observer: 'Observateur',
  }

  const roleColors: { [key: string]: string } = {
    manager: '#8b5cf6',
    member: '#3b82f6',
    observer: '#6b7280',
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager':
        return '👑'
      case 'member':
        return '👤'
      case 'observer':
        return '👁️'
      default:
        return '👤'
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

        {/* Équipe et Groupes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Équipe du projet */}
          <div className="card-theme">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-theme-primary flex items-center gap-2">
                <span>👥</span>
                <span>Équipe du projet</span>
                <span className="text-sm font-normal text-theme-tertiary">({projectContacts.length})</span>
              </h2>
              <button
                onClick={openTeamModal}
                className="btn-secondary text-sm"
              >
                ✏️ Gérer
              </button>
            </div>

            {projectContacts.length === 0 ? (
              <p className="text-center py-8 text-theme-tertiary">
                Aucun membre dans l'équipe
              </p>
            ) : (
              <div className="space-y-3">
                {projectContacts.map((pc) => (
                  <div
                    key={pc.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: `${roleColors[pc.role]}10`,
                      border: `1px solid ${roleColors[pc.role]}30`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${roleColors[pc.role]}30` }}
                    >
                      {getRoleIcon(pc.role)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-theme-primary">
                        {pc.contact?.first_name} {pc.contact?.last_name}
                      </div>
                      <div className="text-sm" style={{ color: roleColors[pc.role] }}>
                        {roleLabels[pc.role]}
                      </div>
                      {pc.contact?.email && (
                        <div className="text-xs text-theme-tertiary">
                          📧 {pc.contact.email}
                        </div>
                      )}
                      {pc.contact?.phone && (
                        <div className="text-xs text-theme-tertiary">
                          📱 {pc.contact.phone}
                        </div>
                      )}
                      {pc.contact?.company && (
                        <div className="text-xs text-theme-tertiary">
                          🏢 {pc.contact.company}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groupes participants */}
          <div className="card-theme">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-theme-primary flex items-center gap-2">
                <span>🏢</span>
                <span>Groupes participants</span>
                <span className="text-sm font-normal text-theme-tertiary">({projectContactGroups.length})</span>
              </h2>
              <button
                onClick={openGroupsModal}
                className="btn-primary text-sm"
              >
                ✏️ Gérer
              </button>
            </div>

            {projectContactGroups.length === 0 ? (
              <p className="text-center py-8 text-theme-tertiary">
                Aucun groupe participant
              </p>
            ) : (
              <div className="space-y-3">
                {projectContactGroups.map((pcg) => (
                  <div
                    key={pcg.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                    style={{
                      backgroundColor: `${pcg.contact_group?.color}10`,
                      borderColor: `${pcg.contact_group?.color}30`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: pcg.contact_group?.color }}
                    >
                      <span className="text-xl">🏢</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-theme-primary">
                        {pcg.contact_group?.name}
                      </div>
                      <div className="text-sm text-theme-secondary">
                        {pcg.contact_group?.type === 'general' && '📁 Général'}
                        {pcg.contact_group?.type === 'family' && '👨‍👩‍👧‍👦 Famille'}
                        {pcg.contact_group?.type === 'company' && '🏢 Entreprise'}
                        {pcg.contact_group?.type === 'friends' && '👥 Amis'}
                        {pcg.contact_group?.type === 'professional' && '💼 Professionnel'}
                      </div>
                      {pcg.contact_group?.description && (
                        <div className="text-xs text-theme-tertiary mt-1">
                          {pcg.contact_group.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Modal Gestion de l'équipe */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-theme-primary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-theme">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-theme-primary">
                  👥 Gérer l'équipe du projet
                </h2>
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="text-theme-tertiary hover:text-theme-secondary font-bold text-xl"
                >
                  ❌
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-theme-secondary">
                    Ajoutez ou retirez des membres de l'équipe
                  </p>
                  <button
                    onClick={addContact}
                    className="btn-secondary text-sm"
                  >
                    + Ajouter un membre
                  </button>
                </div>

                {selectedContacts.length === 0 ? (
                  <p className="text-center py-8 text-theme-tertiary">
                    Aucun membre dans l'équipe
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedContacts.map((sc, index) => {
                      const availableContacts = allContacts.filter(
                        c => !selectedContacts.some((s, i) => i !== index && s.contact_id === c.id)
                      )
                      return (
                        <div
                          key={index}
                          className="flex gap-2 items-center p-3 rounded-lg bg-theme-secondary border border-theme"
                        >
                          <select
                            value={sc.contact_id}
                            onChange={(e) => updateContactId(index, e.target.value)}
                            className="flex-1 px-3 py-2 rounded border text-sm bg-theme-primary border-theme text-theme-primary"
                          >
                            <option value={sc.contact_id}>
                              {allContacts.find(c => c.id === sc.contact_id)?.first_name}{' '}
                              {allContacts.find(c => c.id === sc.contact_id)?.last_name}
                            </option>
                            {availableContacts.map(contact => (
                              <option key={contact.id} value={contact.id}>
                                {contact.first_name} {contact.last_name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={sc.role}
                            onChange={(e) => updateContactRole(index, e.target.value)}
                            className="px-3 py-2 rounded border text-sm bg-theme-primary border-theme text-theme-primary"
                          >
                            <option value="manager">👑 Chef de projet</option>
                            <option value="member">👤 Membre</option>
                            <option value="observer">👁️ Observateur</option>
                          </select>
                          <button
                            onClick={() => removeContact(index)}
                            className="px-3 py-2 rounded text-sm hover:opacity-80"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: 'var(--color-error)',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={saveTeam}
                    className="flex-1 btn-primary"
                  >
                    💾 Enregistrer
                  </button>
                  <button
                    onClick={() => setShowTeamModal(false)}
                    className="px-6 py-3 rounded-lg bg-theme-tertiary text-theme-primary hover:opacity-80 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestion des groupes */}
      {showGroupsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-theme-primary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-theme">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-theme-primary">
                  🏢 Gérer les groupes participants
                </h2>
                <button
                  onClick={() => setShowGroupsModal(false)}
                  className="text-theme-tertiary hover:text-theme-secondary font-bold text-xl"
                >
                  ❌
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-theme-secondary">
                  Sélectionnez les groupes qui participent au projet
                </p>

                {allContactGroups.length === 0 ? (
                  <p className="text-center py-8 text-theme-tertiary">
                    Aucun groupe disponible
                  </p>
                ) : (
                  <div className="space-y-2">
                    {allContactGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 bg-theme-secondary border-theme"
                        style={{
                          backgroundColor: selectedGroups.includes(group.id)
                            ? `${group.color}20`
                            : undefined,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.id)}
                          onChange={() => toggleGroup(group.id)}
                          className="w-5 h-5"
                        />
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: group.color }}
                        >
                          <span className="text-xl">🏢</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-theme-primary">
                            {group.name}
                          </div>
                          <div className="text-sm text-theme-secondary">
                            {group.type === 'general' && '📁 Général'}
                            {group.type === 'family' && '👨‍👩‍👧‍👦 Famille'}
                            {group.type === 'company' && '🏢 Entreprise'}
                            {group.type === 'friends' && '👥 Amis'}
                            {group.type === 'professional' && '💼 Professionnel'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={saveGroups}
                    className="flex-1 btn-primary"
                  >
                    💾 Enregistrer
                  </button>
                  <button
                    onClick={() => setShowGroupsModal(false)}
                    className="px-6 py-3 rounded-lg bg-theme-tertiary text-theme-primary hover:opacity-80 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}