'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

interface ProjectTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: string;
  icon: string;
  color: string;
  is_public: boolean;
  estimated_duration_days?: number;
  created_at: string;
  updated_at: string;
}

interface TemplateTask {
  id: string;
  template_id: string;
  title: string;
  description?: string;
  order_index: number;
  estimated_duration_days?: number;
  priority: 'low' | 'medium' | 'high';
  auto_start: boolean;
}

interface TaskDependency {
  id: string;
  task_id: string;
  prerequisite_task_id: string;
  is_blocking: boolean;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);
  
  // États pour le formulaire de template
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: 'other' as string,
    icon: '📁',
    color: '#8b5cf6',
    is_public: false
  });

  // États pour les tâches
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    estimated_duration_days: 1,
    priority: 'medium' as 'low' | 'medium' | 'high',
    auto_start: false
  });

  // 🆕 États pour les dépendances
  const [selectedDependencies, setSelectedDependencies] = useState<{
    taskId: string;
    isBlocking: boolean;
  }[]>([]);

  const categories = [
    { value: 'marketing', label: 'Marketing', icon: '📢' },
    { value: 'development', label: 'Développement', icon: '💻' },
    { value: 'event', label: 'Événement', icon: '🎉' },
    { value: 'sales', label: 'Ventes', icon: '💰' },
    { value: 'hr', label: 'RH', icon: '👥' },
    { value: 'other', label: 'Autre', icon: '📁' }
  ];

  useEffect(() => {
    checkUser();
    loadTemplates();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const loadTemplateTasks = async (templateId: string) => {
    const { data: tasks } = await supabase
      .from('project_template_tasks')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index');

    const { data: deps } = await supabase
      .from('project_template_task_dependencies')
      .select('*')
      .in('task_id', tasks?.map(t => t.id) || []);

    if (tasks) setTemplateTasks(tasks);
    if (deps) setTaskDependencies(deps);
  };

  const selectTemplate = async (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    await loadTemplateTasks(template.id);
  };

  const openTemplateFormForEdit = (template: ProjectTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      category: template.category,
      icon: template.icon,
      color: template.color,
      is_public: template.is_public
    });
    setShowTemplateForm(true);
  };

  const createTemplate = async () => {
    if (!templateForm.name.trim()) {
      alert('Le nom est requis');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('project_templates')
      .insert([{ ...templateForm, user_id: user.id }])
      .select()
      .single();

    if (error) {
      alert('Erreur lors de la création');
      console.error(error);
      return;
    }

    resetTemplateForm();
    loadTemplates();
    if (data) selectTemplate(data);
  };

  const updateTemplate = async () => {
    if (!editingTemplate || !templateForm.name.trim()) {
      alert('Le nom est requis');
      return;
    }

    const { error } = await supabase
      .from('project_templates')
      .update(templateForm)
      .eq('id', editingTemplate.id);

    if (error) {
      alert('Erreur lors de la mise à jour');
      console.error(error);
      return;
    }

    resetTemplateForm();
    loadTemplates();
    
    // Recharger le template sélectionné si c'est celui qu'on vient de modifier
    if (selectedTemplate?.id === editingTemplate.id) {
      const { data } = await supabase
        .from('project_templates')
        .select('*')
        .eq('id', editingTemplate.id)
        .single();
      
      if (data) setSelectedTemplate(data);
    }
  };

  const resetTemplateForm = () => {
    setShowTemplateForm(false);
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      category: 'other',
      icon: '📁',
      color: '#8b5cf6',
      is_public: false
    });
  };

  const deleteTemplate = async (id: string) => {
    // Vérifier si le template est public
    const template = templates.find(t => t.id === id);
    
    if (template?.is_public) {
      alert('❌ Impossible de supprimer un template public.\n\nVous devez d\'abord le rendre privé via le bouton "Modifier".');
      return;
    }

    // Vérifier que l'utilisateur est le propriétaire
    const { data: { user } } = await supabase.auth.getUser();
    if (template?.user_id !== user?.id) {
      alert('❌ Vous ne pouvez pas supprimer ce template.');
      return;
    }

    if (!confirm('Supprimer ce template et toutes ses tâches ?')) return;

    const { error } = await supabase
      .from('project_templates')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression');
      console.error(error);
      return;
    }

    loadTemplates();
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(null);
      setTemplateTasks([]);
    }
  };

  // 🆕 Fonction pour ouvrir le formulaire de tâche avec les dépendances existantes
  const openTaskFormForEdit = (task: TemplateTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      estimated_duration_days: task.estimated_duration_days || 1,
      priority: task.priority,
      auto_start: task.auto_start
    });

    // Charger les dépendances existantes pour cette tâche
    const taskDeps = taskDependencies
      .filter(dep => dep.task_id === task.id)
      .map(dep => ({
        taskId: dep.prerequisite_task_id,
        isBlocking: dep.is_blocking
      }));
    
    setSelectedDependencies(taskDeps);
    setShowTaskForm(true);
  };

  const addTask = async () => {
    if (!selectedTemplate || !taskForm.title.trim()) {
      alert('Titre requis');
      return;
    }

    const maxOrder = Math.max(...templateTasks.map(t => t.order_index), 0);

    const { data: newTask, error } = await supabase
      .from('project_template_tasks')
      .insert([{
        template_id: selectedTemplate.id,
        ...taskForm,
        order_index: maxOrder + 1
      }])
      .select()
      .single();

    if (error) {
      alert('Erreur lors de l\'ajout');
      return;
    }

    // 🆕 Ajouter les dépendances
    if (newTask && selectedDependencies.length > 0) {
      await saveDependencies(newTask.id);
    }

    resetTaskForm();
    loadTemplateTasks(selectedTemplate.id);
  };

  const updateTask = async () => {
    if (!editingTask || !taskForm.title.trim()) return;

    const { error } = await supabase
      .from('project_template_tasks')
      .update(taskForm)
      .eq('id', editingTask.id);

    if (error) {
      alert('Erreur lors de la mise à jour');
      return;
    }

    // 🆕 Supprimer les anciennes dépendances et ajouter les nouvelles
    await supabase
      .from('project_template_task_dependencies')
      .delete()
      .eq('task_id', editingTask.id);

    if (selectedDependencies.length > 0) {
      await saveDependencies(editingTask.id);
    }

    resetTaskForm();
    if (selectedTemplate) loadTemplateTasks(selectedTemplate.id);
  };

  // 🆕 Sauvegarder les dépendances
  const saveDependencies = async (taskId: string) => {
    const dependenciesToInsert = selectedDependencies.map(dep => ({
      task_id: taskId,
      prerequisite_task_id: dep.taskId,
      is_blocking: dep.isBlocking
    }));

    const { error } = await supabase
      .from('project_template_task_dependencies')
      .insert(dependenciesToInsert);

    if (error) {
      console.error('Erreur sauvegarde dépendances:', error);
    }
  };

  // 🆕 Réinitialiser le formulaire
  const resetTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      estimated_duration_days: 1,
      priority: 'medium',
      auto_start: false
    });
    setSelectedDependencies([]);
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;

    const { error } = await supabase
      .from('project_template_tasks')
      .delete()
      .eq('id', taskId);

    if (!error && selectedTemplate) {
      loadTemplateTasks(selectedTemplate.id);
    }
  };

  // 🆕 Basculer une dépendance
  const toggleDependency = (taskId: string) => {
    const exists = selectedDependencies.find(d => d.taskId === taskId);
    if (exists) {
      setSelectedDependencies(selectedDependencies.filter(d => d.taskId !== taskId));
    } else {
      setSelectedDependencies([...selectedDependencies, { taskId, isBlocking: true }]);
    }
  };

  // 🆕 Basculer si une dépendance est bloquante
  const toggleBlocking = (taskId: string) => {
    setSelectedDependencies(
      selectedDependencies.map(dep =>
        dep.taskId === taskId ? { ...dep, isBlocking: !dep.isBlocking } : dep
      )
    );
  };

  // 🆕 Obtenir les tâches dépendantes (qui dépendent de cette tâche)
  const getDependentTasks = (taskId: string): TemplateTask[] => {
    const dependentTaskIds = taskDependencies
      .filter(dep => dep.prerequisite_task_id === taskId)
      .map(dep => dep.task_id);
    
    return templateTasks.filter(t => dependentTaskIds.includes(t.id));
  };

  // 🆕 Obtenir les tâches prérequises (dont cette tâche dépend)
  const getPrerequisiteTasks = (taskId: string): { task: TemplateTask; isBlocking: boolean }[] => {
    const deps = taskDependencies.filter(dep => dep.task_id === taskId);
    
    return deps.map(dep => ({
      task: templateTasks.find(t => t.id === dep.prerequisite_task_id)!,
      isBlocking: dep.is_blocking
    })).filter(item => item.task);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴 Urgent';
      case 'medium': return '🟡 Normal';
      case 'low': return '🟢 Faible';
      default: return priority;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 
            className="text-4xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            📋 Templates de Projets
          </h1>
          <button
            onClick={() => setShowTemplateForm(true)}
            className="px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            ➕ Nouveau Template
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des templates */}
          <div 
            className="rounded-xl shadow-lg p-6"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <h2 
              className="text-xl font-bold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Mes Templates
            </h2>

            {loading ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>Chargement...</p>
            ) : templates.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Aucun template. Créez-en un !
              </p>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className="p-4 rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: selectedTemplate?.id === template.id 
                        ? 'var(--color-bg-tertiary)' 
                        : 'var(--color-bg-primary)',
                      border: selectedTemplate?.id === template.id 
                        ? `2px solid ${template.color}` 
                        : '2px solid transparent'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <h3 
                            className="font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {template.name}
                          </h3>
                          {template.is_public && (
                            <span className="text-xs text-blue-500">🌐 Public</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(template.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                    {template.description && (
                      <p 
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {template.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Détails du template sélectionné */}
          <div 
            className="lg:col-span-2 rounded-xl shadow-lg p-6"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            {!selectedTemplate ? (
              <div className="text-center py-12">
                <p 
                  className="text-lg"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  👈 Sélectionnez un template pour voir ses tâches
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 
                        className="text-2xl font-bold flex items-center gap-2"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        <span className="text-3xl">{selectedTemplate.icon}</span>
                        {selectedTemplate.name}
                      </h2>
                      <button
                        onClick={() => openTemplateFormForEdit(selectedTemplate)}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                        title="Modifier le template"
                      >
                        ✏️ Modifier
                      </button>
                    </div>
                    {selectedTemplate.description && (
                      <p 
                        className="mt-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {selectedTemplate.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    ➕ Ajouter une tâche
                  </button>
                </div>

                {/* Liste des tâches */}
                <div className="space-y-3">
                  {templateTasks.length === 0 ? (
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Aucune tâche. Ajoutez-en une !
                    </p>
                  ) : (
                    templateTasks.map((task, index) => {
                      const prerequisites = getPrerequisiteTasks(task.id);
                      const dependents = getDependentTasks(task.id);

                      return (
                        <div
                          key={task.id}
                          className="p-4 rounded-lg"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            borderLeft: `4px solid ${getPriorityColor(task.priority)}`
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span 
                                  className="text-xs font-semibold px-2 py-1 rounded"
                                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                                >
                                  #{index + 1}
                                </span>
                                <h3 
                                  className="font-semibold text-lg"
                                  style={{ color: 'var(--color-text-primary)' }}
                                >
                                  {task.title}
                                </h3>
                                {task.auto_start && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    🚀 Auto-start
                                  </span>
                                )}
                              </div>

                              {task.description && (
                                <p 
                                  className="text-sm mb-2"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  {task.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2 text-xs">
                                <span 
                                  className="px-2 py-1 rounded"
                                  style={{ 
                                    backgroundColor: getPriorityColor(task.priority) + '20',
                                    color: getPriorityColor(task.priority)
                                  }}
                                >
                                  {getPriorityLabel(task.priority)}
                                </span>
                                {task.estimated_duration_days && (
                                  <span 
                                    className="px-2 py-1 rounded"
                                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                                  >
                                    ⏱️ {task.estimated_duration_days}j
                                  </span>
                                )}
                              </div>

                              {/* 🆕 Affichage des dépendances */}
                              {prerequisites.length > 0 && (
                                <div className="mt-3 p-2 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    ⬅️ Dépend de :
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {prerequisites.map(({ task: prereqTask, isBlocking }) => (
                                      <span
                                        key={prereqTask.id}
                                        className="text-xs px-2 py-1 rounded"
                                        style={{
                                          backgroundColor: isBlocking ? '#fee2e2' : '#dbeafe',
                                          color: isBlocking ? '#dc2626' : '#2563eb'
                                        }}
                                      >
                                        {isBlocking ? '🔒' : 'ℹ️'} {prereqTask.title}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {dependents.length > 0 && (
                                <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    ➡️ Débloque :
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {dependents.map(depTask => (
                                      <span
                                        key={depTask.id}
                                        className="text-xs px-2 py-1 rounded"
                                        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                                      >
                                        {depTask.title}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => openTaskFormForEdit(task)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Nouveau Template */}
        {showTemplateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div 
              className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: 'var(--color-bg-primary)' }}
            >
              <div className="p-6">
                <h2 
                  className="text-2xl font-bold mb-6"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {editingTemplate ? '✏️ Modifier le Template' : '➕ Nouveau Template'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                      placeholder="Ex: Lancement de Produit"
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
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                      placeholder="Description du template..."
                    />
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Catégorie
                    </label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Couleur
                      </label>
                      <input
                        type="color"
                        value={templateForm.color}
                        onChange={(e) => setTemplateForm({ ...templateForm, color: e.target.value })}
                        className="w-full h-10 rounded-lg border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>

                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Icône (emoji)
                      </label>
                      <input
                        type="text"
                        value={templateForm.icon}
                        onChange={(e) => setTemplateForm({ ...templateForm, icon: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)'
                        }}
                        placeholder="📁"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateForm.is_public}
                      onChange={(e) => setTemplateForm({ ...templateForm, is_public: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span 
                      className="text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Rendre ce template public (visible par tous)
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={editingTemplate ? updateTemplate : createTemplate}
                    className="flex-1 px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {editingTemplate ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    onClick={resetTemplateForm}
                    className="px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
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
          </div>
        )}

        {/* Modal Ajout/Édition Tâche */}
        {showTaskForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div 
              className="rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: 'var(--color-bg-primary)' }}
            >
              <div className="p-6">
                <h2 
                  className="text-2xl font-bold mb-6"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {editingTask ? '✏️ Modifier la tâche' : '➕ Nouvelle tâche'}
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
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                      placeholder="Ex: Étude de marché"
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
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                      placeholder="Détails de la tâche..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Durée estimée (jours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={taskForm.estimated_duration_days}
                        onChange={(e) => setTaskForm({ ...taskForm, estimated_duration_days: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)'
                        }}
                      />
                    </div>

                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Priorité
                      </label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        <option value="low">🟢 Faible</option>
                        <option value="medium">🟡 Normal</option>
                        <option value="high">🔴 Urgent</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskForm.auto_start}
                      onChange={(e) => setTaskForm({ ...taskForm, auto_start: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span 
                      className="text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      🚀 Démarrer automatiquement quand les dépendances sont terminées
                    </span>
                  </label>

                  {/* 🆕 SECTION DÉPENDANCES */}
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    <h3 
                      className="font-semibold mb-3 flex items-center gap-2"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      🔗 Dépendances
                      <span 
                        className="text-xs font-normal"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        (Cette tâche dépend de...)
                      </span>
                    </h3>

                    {templateTasks.length === 0 || (editingTask && templateTasks.length === 1) ? (
                      <p 
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Aucune autre tâche disponible
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {templateTasks
                          .filter(t => !editingTask || t.id !== editingTask.id)
                          .map((task) => {
                            const isSelected = selectedDependencies.some(d => d.taskId === task.id);
                            const dep = selectedDependencies.find(d => d.taskId === task.id);

                            return (
                              <div
                                key={task.id}
                                className="flex items-center gap-3 p-3 rounded-lg"
                                style={{ backgroundColor: 'var(--color-bg-primary)' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleDependency(task.id)}
                                  className="w-4 h-4"
                                />
                                <div className="flex-1">
                                  <p 
                                    className="font-medium"
                                    style={{ color: 'var(--color-text-primary)' }}
                                  >
                                    {task.title}
                                  </p>
                                  <p 
                                    className="text-xs"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                  >
                                    {getPriorityLabel(task.priority)} • {task.estimated_duration_days}j
                                  </p>
                                </div>
                                {isSelected && (
                                  <button
                                    onClick={() => toggleBlocking(task.id)}
                                    className="text-xs px-3 py-1 rounded-lg transition-colors"
                                    style={{
                                      backgroundColor: dep?.isBlocking ? '#fee2e2' : '#dbeafe',
                                      color: dep?.isBlocking ? '#dc2626' : '#2563eb'
                                    }}
                                  >
                                    {dep?.isBlocking ? '🔒 Bloquante' : 'ℹ️ Informative'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}

                    <div 
                      className="mt-3 p-3 rounded-lg text-xs"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                    >
                      <p className="mb-1">💡 <strong>Types de dépendances :</strong></p>
                      <p className="mb-1">• <strong>🔒 Bloquante</strong> : Cette tâche ne pourra démarrer que si la dépendance est terminée</p>
                      <p>• <strong>ℹ️ Informative</strong> : Simple indication, n'empêche pas le démarrage</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={editingTask ? updateTask : addTask}
                    className="flex-1 px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {editingTask ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                  <button
                    onClick={resetTaskForm}
                    className="px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
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
          </div>
        )}
      </div>
    </div>
  );
}
