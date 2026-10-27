import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { LEVEL_LABEL, LOG_LEVELS, LogLevel } from '@/utils/logs';
import { LEVEL_STYLE } from './LogRow';

export type TimePreset = '' | '15m' | '1h' | '24h' | '7d' | 'custom';

export const TIME_PRESETS: Array<{ value: TimePreset; label: string; ms?: number }> = [
  { value: '', label: 'Any time' },
  { value: '15m', label: 'Last 15 min', ms: 15 * 60_000 },
  { value: '1h', label: 'Last hour', ms: 3_600_000 },
  { value: '24h', label: 'Last 24 h', ms: 86_400_000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 86_400_000 },
  { value: 'custom', label: 'Custom…' },
];

export interface FilterValues {
  levels: LogLevel[];
  q: string;
  time: TimePreset;
  from: string; // datetime-local value for custom
  to: string;
  run: string;
  job: string;
  task: string;
  worker: string;
}

interface LogFiltersProps {
  values: FilterValues;
  onChange: (patch: Partial<FilterValues>) => void;
  /** Run/job/task/worker filters exist only for events. */
  entityFilters: boolean;
  /** Time range filters are server-side for events and master logs only. */
  timeFilters: boolean;
}

const field = 'h-8 rounded-md border border-line bg-canvas px-2 text-xs text-fg placeholder:text-fg-subtle/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

export const LogFilters: React.FC<LogFiltersProps> = ({ values, onChange, entityFilters, timeFilters }) => {
  // Typing updates the box at once; the (server) query follows after a pause.
  const [q, setQ] = useState(values.q);
  useEffect(() => setQ(values.q), [values.q]);
  useEffect(() => {
    if (q === values.q) return;
    const t = setTimeout(() => onChange({ q }), 300);
    return () => clearTimeout(t);
  }, [q, values.q, onChange]);
  const [more, setMore] = useState(!!(values.run || values.job || values.task || values.worker));

  const toggleLevel = (l: LogLevel) =>
    onChange({ levels: values.levels.includes(l) ? values.levels.filter((x) => x !== l) : [...values.levels, l] });
  const activeEntity = [values.run, values.job, values.task, values.worker].filter(Boolean).length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Severity" className="flex flex-wrap gap-1">
          {LOG_LEVELS.map((l) => {
            const on = values.levels.includes(l);
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLevel(l)}
                className={clsx(
                  'h-8 cursor-pointer rounded-md border px-2.5 font-mono text-[11px] uppercase tracking-wide transition-colors',
                  on ? clsx('border-current', LEVEL_STYLE[l].text, 'bg-raised') : 'border-line text-fg-subtle hover:text-fg'
                )}
              >
                {LEVEL_LABEL[l]}
              </button>
            );
          })}
        </div>

        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search logs</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages and fields" maxLength={200} className={clsx(field, 'w-full pl-8')} />
        </label>

        {timeFilters && (
          <select aria-label="Time range" value={values.time} onChange={(e) => onChange({ time: e.target.value as TimePreset })} className={clsx(field, 'cursor-pointer')}>
            {TIME_PRESETS.map((p) => (
              <option key={p.value} value={p.value} className="bg-card">{p.label}</option>
            ))}
          </select>
        )}

        {entityFilters && (
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            className={clsx('inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors', activeEntity ? 'border-accent/60 text-accent' : 'border-line text-fg-muted hover:text-fg')}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filters{activeEntity ? ` (${activeEntity})` : ''}
          </button>
        )}
      </div>

      {timeFilters && values.time === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <label className="flex items-center gap-1.5">From <input type="datetime-local" step="1" value={values.from} onChange={(e) => onChange({ from: e.target.value })} className={field} /></label>
          <label className="flex items-center gap-1.5">To <input type="datetime-local" step="1" value={values.to} onChange={(e) => onChange({ to: e.target.value })} className={field} /></label>
        </div>
      )}

      {entityFilters && more && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['run', 'Run ID'],
              ['job', 'Job ID'],
              ['task', 'Task ID'],
              ['worker', 'Worker ID'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="relative">
              <span className="sr-only">{label}</span>
              <input value={values[key]} onChange={(e) => onChange({ [key]: e.target.value.trim() })} placeholder={label} className={clsx(field, 'w-full pr-7 font-mono')} />
              {values[key] && (
                <button type="button" onClick={() => onChange({ [key]: '' })} aria-label={`Clear ${label}`} className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer text-fg-subtle hover:text-fg">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
