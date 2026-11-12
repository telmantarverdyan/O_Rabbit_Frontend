import React from 'react';
import { clsx } from 'clsx';
import { RunStatus, TaskStatus } from '@/api/types';

interface StatusBadgeProps {
  status: RunStatus | TaskStatus | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Text to show instead of the status, when the tone comes from a different word. */
  label?: string;
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
  success: { badge: 'text-[#005a00]', dot: 'bg-[#008000]' },
  active: { badge: 'text-info', dot: 'bg-accent motion-safe:animate-pulse' },
  pending: { badge: 'text-warn', dot: 'bg-[#c8a000]' },
  failed: { badge: 'text-danger', dot: 'bg-danger' },
  neutral: { badge: 'text-fg-muted', dot: 'bg-line' },
};

/** Status pill: the label carries the meaning, the color only reinforces it. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, size = 'md', label: labelOverride }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();
  const tone = toneStyles[toneOf(norm)];
  const label = labelOverride ?? norm.charAt(0) + norm.slice(1).toLowerCase();
  return (
    <span
      className={clsx(
        // A sunken status cell with a colored square: the label carries the meaning.
        'bevel-thin inline-flex items-center gap-1.5 whitespace-nowrap bg-canvas font-bold',
        tone.badge,
        size === 'sm' ? 'px-1.5 py-px text-xs' : size === 'lg' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      <span className={clsx('h-2 w-2 border border-fg/60', tone.dot)} aria-hidden />
      {label}
    </span>
  );
};
