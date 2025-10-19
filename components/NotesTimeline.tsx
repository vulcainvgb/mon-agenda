'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Note {
  id: string;
  note: string;
  rating?: number;
  created_at: string;
}

interface NotesTimelineProps {
  type: 'contact' | 'group';
  entityId: string;
  entityName: string;
}

export default function NotesTimeline({ type, entityId, entityName }: NotesTimelineProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newRating, setNewRating] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadNotes();
  }, [entityId]);

  const loadNotes = async () => {
    try {
      const tableName = type === 'contact' ? 'contact_notes' : 'group_notes';
      const columnName = type === 'contact' ? 'contact_id' : 'group_id';

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(columnName, entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Erreur chargement notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNote.trim()) {
      alert('Veuillez saisir une note');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tableName = type === 'contact' ? 'contact_notes' : 'group_notes';
      const columnName = type === 'contact' ? 'contact_id' : 'group_id';

      const { error } = await supabase
        .from(tableName)
        .insert([{
          [columnName]: entityId,
          user_id: user.id,
          note: newNote,
          rating: newRating,
        }]);

      if (error) throw error;

      setNewNote('');
      setNewRating(undefined);
      setShowForm(false);
      loadNotes();
    } catch (error) {
      console.error('Erreur sauvegarde note:', error);
      alert('Erreur lors de la sauvegarde de la note');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'var(--color-text-tertiary)';
    if (rating >= 8) return '#10b981'; // Vert
    if (rating >= 5) return '#f59e0b'; // Orange
    return '#ef4444'; // Rouge
  };

  const averageRating = notes.length > 0
    ? notes.filter(n => n.rating).reduce((acc, n) => acc + (n.rating || 0), 0) / notes.filter(n => n.rating).length
    : null;

  return (
    <div>
      {/* Header avec stats */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            📝 Historique des notes
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {notes.length} note{notes.length > 1 ? 's' : ''}
            {averageRating && (
              <span className="ml-2">
                • Moyenne : <strong style={{ color: getRatingColor(averageRating) }}>
                  {averageRating.toFixed(1)}/10
                </strong>
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: showForm ? 'var(--color-bg-tertiary)' : 'var(--color-primary)',
            color: showForm ? 'var(--color-text-secondary)' : 'white',
          }}
        >
          {showForm ? '❌ Annuler' : '+ Ajouter une note'}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div
          className="p-4 rounded-lg mb-4 border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Note / Commentaire *
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border transition-all resize-none"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder={`Ajouter une note concernant ${entityName}...`}
                required
              />
            </div>

            {/* Évaluation */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Évaluation (optionnel)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewRating(newRating === value ? undefined : value)}
                    className="w-10 h-10 rounded-lg font-semibold transition-all"
                    style={{
                      backgroundColor: newRating === value
                        ? getRatingColor(value)
                        : 'var(--color-bg-tertiary)',
                      color: newRating === value ? 'white' : 'var(--color-text-secondary)',
                      transform: newRating === value ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {value}
                  </button>
                ))}
                {newRating && (
                  <button
                    type="button"
                    onClick={() => setNewRating(undefined)}
                    className="ml-2 text-sm px-2 py-1 rounded"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--color-error)',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Bouton sauvegarder */}
            <button
              type="submit"
              className="w-full py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
            >
              💾 Enregistrer la note
            </button>
          </form>
        </div>
      )}

      {/* Timeline des notes */}
      {loading ? (
        <div className="text-center py-8">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: 'var(--color-primary)' }}
          />
        </div>
      ) : notes.length === 0 ? (
        <div
          className="text-center py-8 rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p>Aucune note pour le moment</p>
          <p className="text-sm mt-2">Ajoutez votre première note pour commencer l'historique</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, index) => (
            <div
              key={note.id}
              className="p-4 rounded-lg border transition-all hover:shadow-sm"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* En-tête de la note */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {note.rating && (
                    <div
                      className="px-3 py-1 rounded-full font-bold text-sm"
                      style={{
                        backgroundColor: `${getRatingColor(note.rating)}20`,
                        color: getRatingColor(note.rating),
                      }}
                    >
                      {note.rating}/10
                    </div>
                  )}
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {formatDate(note.created_at)}
                  </span>
                </div>
                {index === 0 && (
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    Plus récent
                  </span>
                )}
              </div>

              {/* Contenu de la note */}
              <p
                className="text-sm whitespace-pre-wrap"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {note.note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}