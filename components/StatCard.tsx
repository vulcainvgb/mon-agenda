import React from 'react';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  href?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle,
  trend,
  href 
}) => {
  // Mapping des couleurs vers les variables CSS du thème
  const getColorStyles = (colorName: string) => {
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      blue: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
      green: { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
      purple: { bg: 'var(--color-secondary-light)', text: 'var(--color-secondary)' },
      orange: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
      red: { bg: 'var(--color-danger-light)', text: 'var(--color-danger)' },
      yellow: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
    };

    return colorMap[colorName] || { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)' };
  };

  const colorStyles = getColorStyles(color);

  const content = (
    <div className="card-theme hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div 
          className="p-3 rounded-lg"
          style={{
            backgroundColor: colorStyles.bg,
            color: colorStyles.text
          }}
        >
          {icon}
        </div>
        {trend && (
          <span 
            className="text-sm font-medium"
            style={{ 
              color: trend.isPositive ? 'var(--color-success)' : 'var(--color-danger)' 
            }}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-theme-primary mb-1">{value}</h3>
      <p className="text-sm text-theme-secondary font-medium">{title}</p>
      {subtitle && (
        <p className="text-xs text-theme-tertiary mt-2">{subtitle}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
};

export default StatCard;