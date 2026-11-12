import React from 'react';
import { Progress } from './Progress';

interface TaskProgressBarProps {
  succeeded: number;
  running: number;
  failed: number;
  pending: number;
  canceled?: number;
}

/** One stacked bar for task states; each segment is also listed as text, so color is never the only cue. */
export const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ succeeded, running, failed, pending, canceled = 0 }) => {
  const total = succeeded + running + failed + pending + canceled;
  const segments = [
    { label: 'Succeeded', value: succeeded, className: 'bg-[#008000]' },
    { label: 'Running', value: running, className: 'bg-accent' },
    { label: 'Pending', value: pending, className: 'bg-[#c8a000]' },
    { label: 'Failed', value: failed, className: 'bg-danger' },
    { label: 'Canceled', value: canceled, className: 'bg-line' },
  ];
  const pct = total ? Math.round((succeeded / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="font-pixel text-3xl font-bold tabular-nums text-fg">{pct}%</span>
        <span className="text-xs text-fg-muted">
          {succeeded} of {total} tasks done
        </span>
      </div>
      <Progress value={pct} label="Tasks succeeded" />
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-fg-muted">
            <span className={`h-2 w-2 border border-fg/60 ${s.className}`} aria-hidden />
            {s.label}
            <span className="tabular-nums text-fg">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
