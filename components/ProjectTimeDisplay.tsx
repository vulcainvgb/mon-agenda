// components/ProjectTimeDisplay.tsx
'use client';

interface ProjectTimeDisplayProps {
  timeSpent: number; // en minutes
  className?: string;
}

export default function ProjectTimeDisplay({ timeSpent, className = '' }: ProjectTimeDisplayProps) {
  // Convertir les minutes en heures et minutes
  const hours = Math.floor(timeSpent / 60);
  const minutes = timeSpent % 60;

  // Format d'affichage
  const formatTime = () => {
    if (hours === 0 && minutes === 0) {
      return '0h';
    }
    if (hours === 0) {
      return `${minutes}min`;
    }
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}min`;
  };

  // Couleur selon le temps passé
  const getColorClass = () => {
    if (timeSpent === 0) return 'text-gray-400';
    if (timeSpent < 60) return 'text-blue-600';
    if (timeSpent < 480) return 'text-green-600'; // < 8h
    return 'text-orange-600';
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <svg 
        className={`w-4 h-4 ${getColorClass()}`}
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
      <span className={`text-sm font-medium ${getColorClass()}`}>
        {formatTime()}
      </span>
    </div>
  );
}