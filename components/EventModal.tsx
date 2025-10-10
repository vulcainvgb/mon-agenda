import React from 'react';
import { Event, Project } from '../lib/types';
import moment from 'moment';

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
  setFormData: (data: EventModalProps['formData']) => void;
  projects: Project[];
  onSave: () => void;
  onDelete: () => void;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  formData,
  setFormData,
  projects,
  onSave,
  onDelete
}) => {
  if (!isOpen) return null;

  // 🎓 ANIMATION D'ENTRÉE
  // Le modal apparaît avec une animation fade + scale
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose} // Fermer si on clique sur le fond noir
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      
      {/* 🎓 LE MODAL EN LUI-MÊME */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()} // Empêcher la fermeture si on clique dans le modal
      >
        {/* Header avec couleur */}
        <div 
          className="h-2"
          style={{ backgroundColor: formData.color }}
        />
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8px)]">
          {/* Titre et bouton fermer */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {event ? (
                <>
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier l'événement
                </>
              ) : (
                <>
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nouvel événement
                </>
              )}
            </h2>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Formulaire */}
          <div className="space-y-5">
            {/* 🎓 TITRE AVEC ICÔNE */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Réunion d'équipe, RDV client..."
                autoFocus
              />
            </div>

            {/* 🎓 DATES AVEC DESIGN MODERNE */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Début <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.start_time && moment(formData.start_time).format('dddd D MMMM [à] HH:mm')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.end_time && moment(formData.end_time).format('dddd D MMMM [à] HH:mm')}
                </p>
              </div>
            </div>

            {/* 🎓 DESCRIPTION AVEC COMPTEUR */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Description
                </span>
                <span className="text-xs text-gray-400">
                  {formData.description.length} caractères
                </span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                placeholder="Détails de l'événement, participants, lieu..."
              />
            </div>

            {/* 🎓 PROJET AVEC ICÔNE ET COULEUR */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Projet
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Aucun projet</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    🎯 {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 🎓 PALETTE DE COULEURS MODERNE */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Couleur
              </label>
              <div className="flex gap-3 flex-wrap">
                {[
                  { color: '#3b82f6', name: 'Bleu' },
                  { color: '#ef4444', name: 'Rouge' },
                  { color: '#10b981', name: 'Vert' },
                  { color: '#f59e0b', name: 'Orange' },
                  { color: '#8b5cf6', name: 'Violet' },
                  { color: '#ec4899', name: 'Rose' },
                  { color: '#06b6d4', name: 'Cyan' },
                  { color: '#84cc16', name: 'Lime' }
                ].map(({ color, name }) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`group relative w-12 h-12 rounded-xl transition-all hover:scale-110 ${
                      formData.color === color 
                        ? 'ring-4 ring-offset-2 scale-110' 
                        : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                    }`}
                    style={{ 
                      backgroundColor: color,
                      ...(formData.color === color && { 
                        boxShadow: `0 0 0 4px ${color}40` 
                      })
                    }}
                    title={name}
                  >
                    {formData.color === color && (
                      <svg className="w-6 h-6 text-white absolute inset-0 m-auto drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 🎓 BOUTONS D'ACTION AVEC DESIGN MODERNE */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            {event && (
              <button
                onClick={onDelete}
                className="px-5 py-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all font-semibold flex items-center gap-2 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold hover:scale-105"
            >
              Annuler
            </button>
            
            <button
              onClick={onSave}
              disabled={!formData.title || !formData.start_time || !formData.end_time}
              className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 hover:scale-105 disabled:hover:scale-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {event ? 'Enregistrer' : 'Créer l\'événement'}
            </button>
          </div>
        </div>
      </div>

      {/* 🎓 STYLES D'ANIMATION */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EventModal;