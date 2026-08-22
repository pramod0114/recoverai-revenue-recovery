import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'emerald' | 'rose' | 'amber' | 'blue' | 'slate';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'slate'
}) => {
  const variantStyles = {
    emerald: 'border-emerald-500/30 bg-slate-900/60 text-emerald-400',
    rose: 'border-rose-500/30 bg-slate-900/60 text-rose-400',
    amber: 'border-amber-500/30 bg-slate-900/60 text-amber-400',
    blue: 'border-sky-500/30 bg-slate-900/60 text-sky-400',
    slate: 'border-slate-800 bg-slate-900/60 text-slate-300'
  };

  const iconBgStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    blue: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    slate: 'bg-slate-800 text-slate-300 border border-slate-700'
  };

  return (
    <div className={`p-5 rounded-xl border ${variantStyles[variant]} transition-all hover:border-slate-700 flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
          <div className="text-2xl font-bold text-slate-100 mt-1 tracking-tight">{value}</div>
        </div>
        <div className={`p-2.5 rounded-lg ${iconBgStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        {subtitle && <span className="text-slate-400">{subtitle}</span>}
        {trend && (
          <span
            className={`font-medium font-mono px-1.5 py-0.5 rounded ${
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
