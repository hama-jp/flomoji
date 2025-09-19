import React from 'react';
import { LucideIcon } from 'lucide-react';

interface BaseNodeProps {
  id: string;
  title: string;
  icon: LucideIcon;
  color?: string;
  width?: number;
  height?: number;
  children: React.ReactNode;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  id,
  title,
  icon: Icon,
  color = 'blue',
  width = 300,
  height = 150,
  children
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 hover:shadow-blue-200/50',
    green: 'bg-green-50 border-green-200 hover:shadow-green-200/50',
    purple: 'bg-purple-50 border-purple-200 hover:shadow-purple-200/50',
    orange: 'bg-orange-50 border-orange-200 hover:shadow-orange-200/50',
    red: 'bg-red-50 border-red-200 hover:shadow-red-200/50',
    gray: 'bg-gray-50 border-gray-200 hover:shadow-gray-200/50'
  };

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    gray: 'text-gray-600'
  };

  return (
    <div
      className={`rounded-lg border-2 shadow-sm hover:shadow-lg transition-shadow ${
        colorClasses[color as keyof typeof colorClasses] || colorClasses.blue
      }`}
      style={{ width, minHeight: height }}
    >
      <div className="flex items-center gap-2 p-2 border-b">
        <Icon className={`w-4 h-4 ${iconColorClasses[color as keyof typeof iconColorClasses] || iconColorClasses.blue}`} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
};