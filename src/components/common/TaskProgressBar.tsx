import React from 'react';

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
    { label: 'Succeeded', value: succeeded, className: 'bg-accent' },
    { label: 'Running', value: running, className: 'bg-info' },
    { label: 'Pending', value: pending, className: 'bg-warn' },
    { label: 'Failed', value: failed, className: 'bg-danger' },
    { label: 'Canceled', value: canceled, className: 'bg-fg-subtle' },
  ];
  const pct = total ? Math.round((succeeded / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-semibold tabular-nums text-fg">{pct}%</span>
        <span className="text-xs text-fg-muted">
          {succeeded} of {total} tasks done
        </span>
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Tasks succeeded"
      >
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div key={s.label} className={`${s.className} h-full transition-[width] duration-500`} style={{ width: `${(s.value / total) * 100}%` }} />
            ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-fg-muted">
            <span className={`h-2 w-2 rounded-sm ${s.className}`} aria-hidden />
            {s.label}
            <span className="tabular-nums text-fg">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
