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

const iconColor = {
  emerald: 'text-accent bg-accent/10',
  cyan: 'text-info bg-info/10',
  blue: 'text-info bg-info/10',
  amber: 'text-warn bg-warn/10',
  purple: 'text-violet-300 bg-violet-400/10',
  crimson: 'text-danger bg-danger/10',
  slate: 'text-fg-muted bg-raised',
} as const;

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon: Icon, color = 'emerald', className, trend }) => (
  <div className={clsx('min-w-0 rounded-md border border-line bg-card/90 p-4 transition-colors hover:border-accent/50', className)}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-medium uppercase tracking-widest text-fg-muted">{title}</p>
      <span className={clsx('rounded-md p-1.5', iconColor[color])}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
    </div>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold tabular-nums tracking-tight text-fg glow">{value}</span>
      {trend && <span className="text-xs text-fg-muted">{trend}</span>}
    </div>
    {subtitle && <p className="mt-1 text-xs text-fg-subtle">{subtitle}</p>}
  </div>
);
