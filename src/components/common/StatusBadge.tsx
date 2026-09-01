import React from 'react';
import { clsx } from 'clsx';
import { RunStatus, TaskStatus } from '@/api/types';

interface StatusBadgeProps {
  status: RunStatus | TaskStatus | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, size = 'md' }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();

  const getStyle = () => {
    switch (norm) {
      case 'SUCCEEDED':
      case 'COMPLETE':
      case 'HEALTHY':
      case 'ACTIVE':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
      case 'RUNNING':
      case 'REGISTERING':
      case 'COMMITTING':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] animate-pulse';
      case 'PLANNING':
      case 'PENDING':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
      case 'FAILED':
      case 'QUARANTINED':
      case 'DEAD':
      case 'DEGRADED':
      case 'FIRING':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse';
      case 'CANCELED':
      case 'PAUSED':
        return 'bg-slate-900/60 text-slate-400 border-slate-700/50';
      default:
        return 'bg-emerald-950/30 text-emerald-400/80 border-emerald-800/40';
    }
  };

  const getIndicator = () => {
    switch (norm) {
      case 'SUCCEEDED':
      case 'COMPLETE':
      case 'HEALTHY':
      case 'ACTIVE':
        return '✓';
      case 'RUNNING':
      case 'REGISTERING':
      case 'COMMITTING':
        return '●';
      case 'PLANNING':
      case 'PENDING':
        return '▲';
      case 'FAILED':
      case 'QUARANTINED':
      case 'DEAD':
      case 'FIRING':
        return '✖';
      default:
        return '■';
    }
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-xs gap-2',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-mono font-medium rounded-md border tracking-wider uppercase',
        getStyle(),
        sizeClasses[size],
        className
      )}
    >
      <span className="font-mono text-[10px] opacity-80">{getIndicator()}</span>
      <span>{norm}</span>
    </span>
  );
};

