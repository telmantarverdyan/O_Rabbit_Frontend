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
  emerald: 'text-accent',
  cyan: 'text-info',
  blue: 'text-info',
  amber: 'text-warn',
  purple: 'text-[#5a005a]',
  crimson: 'text-danger',
  slate: 'text-fg-subtle',
} as const;

/** A small stat window: title bar with the label, the value large in a sunken field. */
export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon: Icon, color = 'emerald', className, trend }) => (
  <div className={clsx('bevel-out min-w-0 bg-card p-[2px]', className)}>
    <div className="title-bar flex h-[22px] items-center gap-1.5 px-1.5">
      <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
      <p className="truncate font-pixel text-xs font-semibold uppercase tracking-wide">{title}</p>
    </div>
    <div className="bevel-in m-1.5 bg-canvas px-2 py-1.5">
      <div className="flex items-baseline gap-2">
        <span className={clsx('font-pixel text-2xl font-bold tabular-nums', iconColor[color])}>{value}</span>
        {trend && <span className="text-xs text-fg-muted">{trend}</span>}
      </div>
      {subtitle && <p className="truncate text-xs text-fg-subtle">{subtitle}</p>}
    </div>
  </div>
);
