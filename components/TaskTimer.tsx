// components/TaskTimer.tsx
'use client';

import { useState, useEffect } from 'react';

interface TaskTimerProps {
  task: {
    id: string;
    status: 'todo' | 'in_progress' | 'done';
    time_spent?: number;
    started_at?: string | null;
  };
  onUpdateTime?: (taskId: string, newTime: number) => Promise<void>;
  className?: string;
}

export default function TaskTimer({ task, onUpdateTime, className = '' }: TaskTimerProps) {
  const [currentTime, setCurrentTime] = useState(task.time_spent || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Calculer le temps en direct pour les tâches en cours
  useEffect(() => {
    if (task.status === 'in_progress' && task.started_at) {
      const interval = setInterval(() => {
        const startedAt = new Date(task.started_at!);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60));
        setCurrentTime((task.time_spent || 0) + elapsedMinutes);
      }, 1000); // Mise à jour chaque seconde

      return () => clearInterval(interval);
    } else {
      setCurrentTime(task.time_spent || 0);
    }
  }, [task.status, task.started_at, task.time_spent]);

  // Formater le temps (heures:minutes)
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}min`;
  };

  // Sauvegarder le temps édité
  const handleSaveEdit = async () => {
    if (!onUpdateTime) return;

    // Parser la valeur (format attendu : "2h30" ou "150" ou "2:30")
    let newMinutes = 0;
    
    if (editValue.includes('h')) {
      const [h, m] = editValue.split('h');
      newMinutes = parseInt(h) * 60 + (parseInt(m) || 0);
    } else if (editValue.includes(':')) {
      const [h, m] = editValue.split(':');
      newMinutes = parseInt(h) * 60 + parseInt(m);
    } else {
      newMinutes = parseInt(editValue) || 0;
    }

    await onUpdateTime(task.id, newMinutes);
    setIsEditing(false);
  };

  // Affichage du temps
  if (currentTime === 0 && task.status !== 'in_progress') {
    return null; // Ne rien afficher si pas de temps
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icône */}
      <svg 
        className={`w-4 h-4 ${
          task.status === 'in_progress' ? 'text-blue-600 animate-pulse' : 'text-gray-500'
        }`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>

      {/* Temps */}
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
            onBlur={handleSaveEdit}
            placeholder="Ex: 2h30"
            className="w-20 px-2 py-1 text-xs border border-blue-300 rounded"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => {
            if (onUpdateTime) {
              setEditValue(formatTime(currentTime));
              setIsEditing(true);
            }
          }}
          className={`text-sm font-medium ${
            task.status === 'in_progress' ? 'text-blue-600' : 'text-gray-600'
          } ${onUpdateTime ? 'hover:underline cursor-pointer' : ''}`}
          disabled={!onUpdateTime}
        >
          {formatTime(currentTime)}
          {task.status === 'in_progress' && (
            <span className="ml-1 text-xs">⏱️</span>
          )}
        </button>
      )}
    </div>
  );
}