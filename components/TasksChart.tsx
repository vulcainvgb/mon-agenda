import React from 'react';
import { ChartData } from '@/lib/types';

interface TasksChartProps {
  data: ChartData[];
}

const TasksChart: React.FC<TasksChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calculer les pourcentages
  const dataWithPercentage = data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribution des tâches</h3>
      
      {total === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucune tâche pour le moment</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Barre de progression */}
          <div className="h-8 bg-gray-100 rounded-full overflow-hidden flex">
            {dataWithPercentage.map((item, index) => (
              item.value > 0 && (
                <div
                  key={index}
                  className="h-full transition-all duration-300 hover:opacity-80"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color
                  }}
                  title={`${item.name}: ${item.value} (${item.percentage.toFixed(1)}%)`}
                />
              )
            ))}
          </div>

          {/* Légende avec détails */}
          <div className="grid grid-cols-1 gap-3">
            {dataWithPercentage.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-gray-700">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span className="font-bold text-gray-900 min-w-[2rem] text-right">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">{total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksChart;