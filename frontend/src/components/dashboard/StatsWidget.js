// frontend/src/components/dashboard/StatsWidget.js
import React from 'react';

const StatsWidget = ({ title, value, subtitle, icon, color = 'blue', trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600'
  };

  const textColorClasses = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    purple: 'text-purple-900',
    orange: 'text-orange-900',
    red: 'text-red-900',
    yellow: 'text-yellow-900'
  };

  const trendColorClasses = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`text-sm font-medium ${colorClasses[color]}`}>
            {title}
          </div>
          <div className={`text-2xl font-bold mt-1 ${textColorClasses[color]}`}>
            {value}
          </div>
          {subtitle && (
            <div className={`text-xs mt-1 ${colorClasses[color]}`}>
              {subtitle}
            </div>
          )}
          {trend && (
            <div className={`text-xs mt-2 font-medium ${trendColorClasses[trend.direction]}`}>
              {trend.direction === 'up' && '↑'}
              {trend.direction === 'down' && '↓'}
              {trend.direction === 'neutral' && '→'}
              {' '}{trend.text}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-50">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsWidget;
