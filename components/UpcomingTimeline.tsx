import React from 'react';
import Link from 'next/link';
import { UpcomingItem } from '@/lib/types';
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UpcomingTimelineProps {
  items: UpcomingItem[];
}

const UpcomingTimeline: React.FC<UpcomingTimelineProps> = ({ items }) => {
  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Aujourd\'hui';
    if (isTomorrow(date)) return 'Demain';
    const days = differenceInDays(date, new Date());
    if (days <= 7) return `Dans ${days} jours`;
    return format(date, 'dd MMM yyyy', { locale: fr });
  };

  const getPriorityStyles = (priority?: string) => {
    switch (priority) {
      case 'high': 
        return {
          backgroundColor: 'var(--color-danger-light)',
          color: 'var(--color-danger)',
          borderColor: 'var(--color-danger)'
        };
      case 'medium': 
        return {
          backgroundColor: 'var(--color-warning-light)',
          color: 'var(--color-warning)',
          borderColor: 'var(--color-warning)'
        };
      case 'low': 
        return {
          backgroundColor: 'var(--color-success-light)',
          color: 'var(--color-success)',
          borderColor: 'var(--color-success)'
        };
      default: 
        return {
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-secondary)',
          borderColor: 'var(--color-border)'
        };
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'event') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
  };

  const getTypeStyles = (type: string) => {
    if (type === 'event') {
      return {
        backgroundColor: 'var(--color-primary-light)',
        color: 'var(--color-primary)'
      };
    }
    return {
      backgroundColor: 'var(--color-secondary-light)',
      color: 'var(--color-secondary)'
    };
  };

  if (items.length === 0) {
    return (
      <div className="card-theme text-center py-8">
        <svg className="w-16 h-16 mx-auto text-theme-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-theme-tertiary">Aucun événement ou tâche à venir</p>
      </div>
    );
  }

  return (
    <div className="card-theme">
      <h3 className="text-lg font-semibold text-theme-primary mb-4">Prochaines échéances</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div 
            key={`${item.type}-${item.id}`} 
            className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
            style={{ borderColor: 'var(--color-border-light)' }}
          >
            <div 
              className="p-2 rounded-lg"
              style={getTypeStyles(item.type)}
            >
              {getTypeIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Link 
                    href={item.type === 'event' ? '/calendrier' : '/taches'}
                    className="font-medium text-theme-primary hover:opacity-80 transition-all inline-block"
                    style={{ 
                      '--hover-color': 'var(--color-primary)'
                    } as any}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '';
                    }}
                  >
                    {item.title}
                  </Link>
                  {item.project && (
                    <Link 
                      href={`/projets/${item.project.id}`}
                      className="inline-flex items-center gap-1 mt-1"
                    >
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: item.project.color }}
                      />
                      <span 
                        className="text-xs text-theme-secondary hover:opacity-80 transition-all"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '';
                        }}
                      >
                        {item.project.name}
                      </span>
                    </Link>
                  )}
                </div>
                {item.priority && (
                  <span 
                    className="text-xs px-2 py-1 rounded border"
                    style={getPriorityStyles(item.priority)}
                  >
                    {item.priority === 'high' ? 'Urgent' : item.priority === 'medium' ? 'Moyen' : 'Faible'}
                  </span>
                )}
              </div>
              <p className="text-sm text-theme-secondary mt-1">
                {getDateLabel(item.date)} • {format(parseISO(item.date), 'HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingTimeline;