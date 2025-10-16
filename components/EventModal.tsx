'use client';

import { Event, Project } from '../lib/types';
import ProjectTimeDisplay from './ProjectTimeDisplay';
import { GOOGLE_CALENDAR_COLORS } from '../lib/google-colors';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  formData: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    color: string;
    project_id: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  projects: Project[];
  onSave: () => void;
  onDelete: () => void;
}

// 🎨 Palette de couleurs Google Calendar avec noms français (couleurs exactes)
const GOOGLE_COLORS = [
  { hex: '#7986cb', name: 'Lavande' },
  { hex: '#33b679', name: 'Sauge' },
  { hex: '#8e24aa', name: 'Raisin' },
  { hex: '#e67c73', name: 'Flamant' },
  { hex: '#f6bf26', name: 'Banane' },
  { hex: '#f4511e', name: 'Mandarine' },
  { hex: '#039be5', name: 'Turquoise' },
  { hex: '#616161', name: 'Graphite' },
  { hex: '#3f51b5', name: 'Bleuet' },
  { hex: '#0b8043', name: 'Basilic' },
  { hex: '#d50000', name: 'Tomate' }
];

export default function EventModal({
  isOpen,
  onClose,
  event,
  formData,
  setFormData,
  projects,
  onSave,
  onDelete
}: EventModalProps) {
  if (!isOpen) return null;

  // Fonction pour calculer l'heure de fin automatiquement (+1h)
  const handleStartTimeChange = (newStartTime: string) => {
    setFormData((prev: any) => {
      // Calculer l'heure de fin (1h après le début)
      const startDate = new Date(newStartTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 heure
      
      // Formater pour input datetime-local
      const endTimeFormatted = endDate.toISOString().slice(0, 16);
      
      return {
        ...prev,
        start_time: newStartTime,
        end_time: endTimeFormatted
      };
    });
  };

  // Trouver le projet sélectionné
  const selectedProject = projects.find(p => p.id === formData.project_id);

  // Calculer la durée de cet événement (en minutes)
  const calculateEventDuration = () => {
    if (!formData.start_time || !formData.end_time) return 0;
    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const eventDuration = calculateEventDuration();

  // Trouver le nom de la couleur sélectionnée
  const selectedColorName = GOOGLE_COLORS.find(c => c.hex === formData.color)?.name || 'Personnalisée';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {event ? 'Modifier l\'événement' : 'Nouvel événement'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Titre de l'événement"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Description de l'événement"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Début *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fin *
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Durée de l'événement */}
            {eventDuration > 0 && (
              <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-600">
                Durée : <span className="font-medium">{Math.floor(eventDuration / 60)}h {eventDuration % 60}min</span>
              </div>
            )}

            {/* Projet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projet
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Aucun projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.time_spent && project.time_spent > 0 && 
                      ` (${Math.floor(project.time_spent / 60)}h${project.time_spent % 60}min passées)`
                    }
                  </option>
                ))}
              </select>

              {/* Affichage du temps du projet sélectionné */}
              {selectedProject && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedProject.color }}
                      />
                      <span className="font-medium text-gray-900">{selectedProject.name}</span>
                    </div>
                    <ProjectTimeDisplay timeSpent={selectedProject.time_spent || 0} />
                  </div>
                  
                  {selectedProject.description && (
                    <p className="text-sm text-gray-600 mb-2">{selectedProject.description}</p>
                  )}

                  {/* Info sur l'ajout de temps */}
                  {eventDuration > 0 && (
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-200">
                      {event && event.project_id === selectedProject.id ? (
                        <span>💡 Les modifications de durée mettront à jour le temps du projet</span>
                      ) : (
                        <span>💡 Cet événement ajoutera <strong>{Math.floor(eventDuration / 60)}h {eventDuration % 60}min</strong> au projet</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Couleur - Palette Google Calendar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur : <span className="text-gray-500 font-normal">{selectedColorName}</span>
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                {GOOGLE_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: colorOption.hex })}
                    className={`group relative flex flex-col items-center transition-all ${
                      formData.color === colorOption.hex 
                        ? 'transform scale-110' 
                        : 'hover:scale-105'
                    }`}
                    title={colorOption.name}
                  >
                    <div 
                      className={`w-10 h-10 rounded-full transition-all ${
                        formData.color === colorOption.hex 
                          ? 'ring-3 ring-offset-2 ring-gray-900 shadow-lg' 
                          : 'hover:shadow-md'
                      }`}
                      style={{ backgroundColor: colorOption.hex }}
                    >
                      {/* Checkmark pour la couleur sélectionnée */}
                      {formData.color === colorOption.hex && (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Nom de la couleur au survol (caché sur mobile) */}
                    <span className="hidden sm:block absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow-sm">
                      {colorOption.name}
                    </span>
                  </button>
                ))}
              </div>
              {/* Note pour mobile */}
              <p className="mt-3 text-xs text-gray-500 sm:hidden">
                💡 Touchez une couleur pour la sélectionner
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            {event && (
              <button
                onClick={onDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {event ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}