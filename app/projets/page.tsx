'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProjectTimeDisplay from '@/components/ProjectTimeDisplay';
import { ContactGroup } from '../../lib/types';

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

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
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

export default function ProjetsPage() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([])
  const [projectContacts, setProjectContacts] = useState<{ [projectId: string]: ProjectContact[] }>({})
  const [projectContactGroups, setProjectContactGroups] = useState<{ [projectId: string]: ProjectContactGroup[] }>({})
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
  const [selectedContacts, setSelectedContacts] = useState<Array<{ contact_id: string; role: string }>>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  
  // États pour l'édition
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editBudgetTotal, setEditBudgetTotal] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editSelectedContacts, setEditSelectedContacts] = useState<Array<{ contact_id: string; role: string }>>([])
  const [editSelectedGroups, setEditSelectedGroups] = useState<string[]>([])
  
  // Stats par projet (nombre de tâches/événements)
  const [projectStats, setProjectStats] = useState<{[key: string]: {tasks: number, events: number, tasksDone: number}}>({})
  
  useEffect(() => {
    checkUser()
    loadProjects()
    loadContacts()
    loadContactGroups()
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
      if (data && data.length > 0) {
        await loadProjectContacts(data.map(p => p.id))
        await loadProjectContactGroups(data.map(p => p.id))
      }
    }
    
    setLoading(false)
    setIsRefreshing(false)
  }

  const loadProjectContacts = async (projectIds: string[]) => {
    if (projectIds.length === 0) return
    
    try {
      const { data, error } = await supabase
        .from('project_contacts')
        .select(`
          *,
          contact:contacts(*)
        `)
        .in('project_id', projectIds)

      if (error) throw error

      const contactsByProject: { [projectId: string]: ProjectContact[] } = {}
      ;(data || []).forEach((pc: ProjectContact) => {
        if (!contactsByProject[pc.project_id]) {
          contactsByProject[pc.project_id] = []
        }
        contactsByProject[pc.project_id].push(pc)
      })

      setProjectContacts(contactsByProject)
    } catch (error) {
      console.error('Erreur chargement contacts de projets:', error)
    }
  }

  const loadProjectContactGroups = async (projectIds: string[]) => {
    if (projectIds.length === 0) return
    
    try {
      const { data, error } = await supabase
        .from('project_contact_groups')
        .select(`
          *,
          contact_group:contact_groups(*)
        `)
        .in('project_id', projectIds)

      if (error) throw error

      const groupsByProject: { [projectId: string]: ProjectContactGroup[] } = {}
      ;(data || []).forEach((pcg: ProjectContactGroup) => {
        if (!groupsByProject[pcg.project_id]) {
          groupsByProject[pcg.project_id] = []
        }
        groupsByProject[pcg.project_id].push(pcg)
      })

      setProjectContactGroups(groupsByProject)
    } catch (error) {
      console.error('Erreur chargement groupes de projets:', error)
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
    
    const { data, error } = await supabase
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
        project_id: data.id,
        contact_id: sc.contact_id,
        role: sc.role,
      }))

      const { error: contactError } = await supabase
        .from('project_contacts')
        .insert(contactsToInsert)

      if (contactError) {
        console.error('Erreur ajout contacts:', contactError)
      }
    }

    // Ajouter les groupes
    if (selectedGroups.length > 0) {
      const groupsToInsert = selectedGroups.map(groupId => ({
        project_id: data.id,
        group_id: groupId,
      }))

      const { error: groupError } = await supabase
        .from('project_contact_groups')
        .insert(groupsToInsert)

      if (groupError) {
        console.error('Erreur ajout groupes:', groupError)
      }
    }

    setName('')
    setDescription('')
    setColor('#8b5cf6')
    setBudgetTotal('')
    setStartDate('')
    setEndDate('')
    setSelectedContacts([])
    setSelectedGroups([])
    setShowForm(false)
    loadProjects()
  }
  
  const startEdit = async (project: Project) => {
    setEditingProject(project)
    setEditName(project.name)
    setEditDescription(project.description || '')
    setEditColor(project.color || '#8b5cf6')
    setEditBudgetTotal(project.budget_total?.toString() || '')
    setEditStartDate(project.start_date || '')
    setEditEndDate(project.end_date || '')
    setShowForm(false)

    // Charger les contacts du projet
    const { data: contactsData, error: contactsError } = await supabase
      .from('project_contacts')
      .select('*')
      .eq('project_id', project.id)

    if (!contactsError && contactsData) {
      setEditSelectedContacts(contactsData.map(pc => ({
        contact_id: pc.contact_id,
        role: pc.role,
      })))
    } else {
      setEditSelectedContacts([])
    }

    // Charger les groupes du projet
    const { data: groupsData, error: groupsError } = await supabase
      .from('project_contact_groups')
      .select('*')
      .eq('project_id', project.id)

    if (!groupsError && groupsData) {
      setEditSelectedGroups(groupsData.map(pcg => pcg.group_id))
    } else {
      setEditSelectedGroups([])
    }
    
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
    setEditSelectedContacts([])
    setEditSelectedGroups([])
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
      return
    }

    // Supprimer les anciens contacts et ajouter les nouveaux
    await supabase
      .from('project_contacts')
      .delete()
      .eq('project_id', editingProject.id)

    if (editSelectedContacts.length > 0) {
      const contactsToInsert = editSelectedContacts.map(sc => ({
        project_id: editingProject.id,
        contact_id: sc.contact_id,
        role: sc.role,
      }))

      const { error: contactError } = await supabase
        .from('project_contacts')
        .insert(contactsToInsert)

      if (contactError) {
        console.error('Erreur mise à jour contacts:', contactError)
      }
    }

    // Supprimer les anciens groupes et ajouter les nouveaux
    await supabase
      .from('project_contact_groups')
      .delete()
      .eq('project_id', editingProject.id)

    if (editSelectedGroups.length > 0) {
      const groupsToInsert = editSelectedGroups.map(groupId => ({
        project_id: editingProject.id,
        group_id: groupId,
      }))

      const { error: groupError } = await supabase
        .from('project_contact_groups')
        .insert(groupsToInsert)

      if (groupError) {
        console.error('Erreur mise à jour groupes:', groupError)
      }
    }

    cancelEdit()
    loadProjects()
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

  const addContact = (isEdit: boolean = false) => {
    if (contacts.length === 0) {
      alert('Aucun contact disponible. Créez d\'abord des contacts.')
      return
    }
    const newContact = { contact_id: contacts[0].id, role: 'member' }
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
    manager: 'Chef de projet',
    member: 'Membre',
    observer: 'Observateur',
  }

  const roleColors: { [key: string]: string } = {
    manager: '#8b5cf6',
    member: '#3b82f6',
    observer: '#6b7280',
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

              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-theme-secondary">
                    👥 Équipe du projet
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
                  <p className="text-sm text-center py-4 text-theme-tertiary">
                    Aucun membre
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
                          className="flex-1 px-3 py-1 rounded border text-sm bg-theme-secondary border-theme text-theme-primary"
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
                          className="px-3 py-1 rounded border text-sm bg-theme-secondary border-theme text-theme-primary"
                        >
                          <option value="manager">👑 Chef de projet</option>
                          <option value="member">👤 Membre</option>
                          <option value="observer">👁️ Observateur</option>
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
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  🏢 Groupes participants
                </label>

                {contactGroups.length === 0 ? (
                  <p className="text-sm text-center py-4 text-theme-tertiary">
                    Aucun groupe disponible
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contactGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:opacity-80 bg-theme-primary border-theme"
                        style={{
                          backgroundColor: editSelectedGroups.includes(group.id)
                            ? `${group.color}20`
                            : undefined,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editSelectedGroups.includes(group.id)}
                          onChange={() => toggleGroup(group.id, true)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-theme-primary">
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

              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-theme-secondary">
                    👥 Équipe du projet
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
                  <p className="text-sm text-center py-4 text-theme-tertiary">
                    Aucun membre
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedContacts.map((sc, index) => (
                      <div
                        key={index}
                        className="flex gap-2 items-center p-2 rounded-lg bg-theme-secondary"
                      >
                        <select
                          value={sc.contact_id}
                          onChange={(e) => updateContactId(index, e.target.value, false)}
                          className="flex-1 px-3 py-1 rounded border text-sm bg-theme-primary border-theme text-theme-primary"
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
                          className="px-3 py-1 rounded border text-sm bg-theme-primary border-theme text-theme-primary"
                        >
                          <option value="manager">👑 Chef de projet</option>
                          <option value="member">👤 Membre</option>
                          <option value="observer">👁️ Observateur</option>
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
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  🏢 Groupes participants
                </label>

                {contactGroups.length === 0 ? (
                  <p className="text-sm text-center py-4 text-theme-tertiary">
                    Aucun groupe disponible
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contactGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:opacity-80 bg-theme-secondary border-theme"
                        style={{
                          backgroundColor: selectedGroups.includes(group.id)
                            ? `${group.color}20`
                            : undefined,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.id)}
                          onChange={() => toggleGroup(group.id, false)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-theme-primary">
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
                const projectContactsList = projectContacts[project.id] || []
                const projectGroupsList = projectContactGroups[project.id] || []
                
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

                    {/* Équipe du projet */}
                    {projectContactsList.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {projectContactsList.slice(0, 3).map((pc) => (
                          <div
                            key={pc.id}
                            className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                            style={{
                              backgroundColor: `${roleColors[pc.role]}20`,
                              color: roleColors[pc.role],
                            }}
                          >
                            {pc.role === 'manager' && '👑'}
                            {pc.role === 'member' && '👤'}
                            {pc.role === 'observer' && '👁️'}
                            <span>{pc.contact?.first_name} {pc.contact?.last_name}</span>
                          </div>
                        ))}
                        {projectContactsList.length > 3 && (
                          <div className="text-xs text-theme-tertiary">
                            +{projectContactsList.length - 3} autre(s)
                          </div>
                        )}
                      </div>
                    )}

                    {/* Groupes participants */}
                    {projectGroupsList.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {projectGroupsList.map((pcg) => (
                          <div
                            key={pcg.id}
                            className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                            style={{
                              backgroundColor: `${pcg.contact_group?.color}20`,
                              color: pcg.contact_group?.color,
                            }}
                          >
                            <span>🏢</span>
                            <span>{pcg.contact_group?.name}</span>
                          </div>
                        ))}
                      </div>
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