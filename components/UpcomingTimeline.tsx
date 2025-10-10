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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500">Aucun événement ou tâche à venir</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Prochaines échéances</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
            <div className={`p-2 rounded-lg ${item.type === 'event' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
              {getTypeIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Link 
                    href={item.type === 'event' ? '/calendrier' : '/taches'}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
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
                      <span className="text-xs text-gray-600 hover:text-blue-600">
                        {item.project.name}
                      </span>
                    </Link>
                  )}
                </div>
                {item.priority && (
                  <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(item.priority)}`}>
                    {item.priority === 'high' ? 'Urgent' : item.priority === 'medium' ? 'Moyen' : 'Faible'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
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