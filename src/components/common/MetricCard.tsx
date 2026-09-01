import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'emerald' | 'blue' | 'amber' | 'purple' | 'slate' | 'cyan' | 'crimson';
  className?: string;
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'emerald',
  className,
  trend,
}) => {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
    crimson: 'text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
    slate: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  };

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-surface-border bg-surface/90 p-4 sm:p-5 shadow-terminal-sm backdrop-blur-md transition-all duration-200 hover:border-emerald-500/40 hover:shadow-terminal-md group',
        className
      )}
    >
      {/* Corner bracket decorative elements */}
      <span className="absolute top-1 left-1.5 text-[8px] font-mono text-emerald-500/30 group-hover:text-emerald-400/60 transition-colors">┌</span>
      <span className="absolute top-1 right-1.5 text-[8px] font-mono text-emerald-500/30 group-hover:text-emerald-400/60 transition-colors">┐</span>
      <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-emerald-500/30 group-hover:text-emerald-400/60 transition-colors">└</span>
      <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-emerald-500/30 group-hover:text-emerald-400/60 transition-colors">┘</span>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/70 font-mono flex items-center gap-1.5">
            <span className="text-emerald-500/60 font-mono">$</span>
            {title}
          </p>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-bold tracking-tight text-emerald-100 font-mono glow-emerald">
              {value}
            </span>
            {trend && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-emerald-400/50 font-mono">{subtitle}</p>
          )}
        </div>
        <div className={clsx('rounded-lg border p-2.5 transition-transform group-hover:scale-105', colorMap[color])}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
};

