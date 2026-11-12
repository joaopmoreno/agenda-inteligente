import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  variant: 'default' | 'amber' | 'rose' | 'emerald';
  description?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  count,
  icon: Icon,
  variant,
  description,
  onClick,
}) => {
  const variantStyles = {
    default: 'bg-white border-slate-200 text-slate-800 icon-bg:bg-slate-100 icon-text:text-slate-600',
    amber: 'bg-amber-50/70 border-amber-200 text-amber-950 icon-bg:bg-amber-100 icon-text:text-amber-700',
    rose: 'bg-rose-50/70 border-rose-200 text-rose-950 icon-bg:bg-rose-100 icon-text:text-rose-700',
    emerald: 'bg-emerald-50/70 border-emerald-200 text-emerald-950 icon-bg:bg-emerald-100 icon-text:text-emerald-700',
  };

  const iconVariants = {
    default: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`p-5 rounded-2xl border transition-all shadow-xs ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconVariants[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{count}</span>
        {description && (
          <span className="text-xs text-slate-500 font-medium">{description}</span>
        )}
      </div>
    </div>
  );
};
