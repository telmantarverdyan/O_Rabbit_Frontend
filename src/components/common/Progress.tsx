import React from 'react';
import { clsx } from 'clsx';

const BLOCKS = 20;

/**
 * Win9x segmented progress bar. With `value` (0-100) it fills blocks; without
 * it, a short run of blocks sweeps across (indeterminate, for loading).
 */
export const Progress: React.FC<{ value?: number; label?: string; className?: string; tone?: string }> = ({ value, label, className, tone = 'bg-accent' }) => {
  const filled = value === undefined ? 0 : Math.round((Math.min(100, Math.max(0, value)) / 100) * BLOCKS);
  return (
    <div
      className={clsx('bevel-in flex h-[22px] gap-[2px] overflow-hidden bg-canvas p-[3px]', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={value === undefined ? undefined : 0}
      aria-valuemax={value === undefined ? undefined : 100}
      aria-valuenow={value === undefined ? undefined : Math.round(value)}
    >
      {value === undefined ? (
        <div className="flex h-full w-1/3 gap-[2px] motion-safe:animate-[progress-sweep_1.4s_steps(14)_infinite]">
          {Array.from({ length: 6 }, (_, i) => <span key={i} className={clsx('h-full flex-1', tone)} />)}
        </div>
      ) : (
        Array.from({ length: BLOCKS }, (_, i) => <span key={i} className={clsx('h-full flex-1', i < filled ? tone : 'bg-transparent')} />)
      )}
    </div>
  );
};
