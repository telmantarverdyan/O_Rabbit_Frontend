import React from 'react';
import { clsx } from 'clsx';
import { RunStatus, TaskStatus } from '@/api/types';

interface StatusBadgeProps {
  status: RunStatus | TaskStatus | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

type Tone = 'success' | 'active' | 'pending' | 'failed' | 'neutral';

function toneOf(status: string): Tone {
  switch (status) {
    case 'SUCCEEDED':
    case 'COMPLETE':
    case 'HEALTHY':
    case 'ACTIVE':
      return 'success';
    case 'RUNNING':
    case 'REGISTERING':
    case 'COMMITTING':
      return 'active';
    case 'PLANNING':
    case 'PENDING':
      return 'pending';
    case 'FAILED':
    case 'QUARANTINED':
    case 'DEAD':
    case 'DEGRADED':
    case 'REVOKED':
      return 'failed';
    default:
      return 'neutral';
  }
}

const toneStyles: Record<Tone, { badge: string; dot: string }> = {
  success: { badge: 'bg-accent/10 text-accent ring-accent/25', dot: 'bg-accent' },
  active: { badge: 'bg-info/10 text-info ring-info/25', dot: 'bg-info motion-safe:animate-pulse' },
  pending: { badge: 'bg-warn/10 text-warn ring-warn/25', dot: 'bg-warn' },
  failed: { badge: 'bg-danger/10 text-danger ring-danger/25', dot: 'bg-danger' },
  neutral: { badge: 'bg-raised text-fg-muted ring-line', dot: 'bg-fg-subtle' },
};

/** Status pill: the label carries the meaning, the color only reinforces it. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, size = 'md' }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();
  const tone = toneStyles[toneOf(norm)];
  const label = norm.charAt(0) + norm.slice(1).toLowerCase();
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset',
        tone.badge,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs',
        className
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', tone.dot)} aria-hidden />
      {label}
    </span>
  );
};
