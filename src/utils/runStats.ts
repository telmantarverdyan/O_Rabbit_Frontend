import { Run } from '@/api/types';

/** Run statuses in display order; also the stacking order of status bars. */
export const RUN_STATUS_ORDER = ['SUCCEEDED', 'RUNNING', 'COMMITTING', 'PLANNING', 'FAILED', 'CANCELED'] as const;

/** Status colors (CSS classes) and labels. Charts always show the label too, never color alone. */
export const STATUS_STYLE: Record<string, { label: string; bar: string; dot: string }> = {
  SUCCEEDED: { label: 'Succeeded', bar: 'bg-accent', dot: 'bg-accent' },
  RUNNING: { label: 'Running', bar: 'bg-info', dot: 'bg-info' },
  COMMITTING: { label: 'Committing', bar: 'bg-info/60', dot: 'bg-info/60' },
  PLANNING: { label: 'Planning', bar: 'bg-warn', dot: 'bg-warn' },
  PENDING: { label: 'Pending', bar: 'bg-warn', dot: 'bg-warn' },
  QUARANTINED: { label: 'Quarantined', bar: 'bg-danger/60', dot: 'bg-danger/60' },
  FAILED: { label: 'Failed', bar: 'bg-danger', dot: 'bg-danger' },
  CANCELED: { label: 'Canceled', bar: 'bg-fg-subtle', dot: 'bg-fg-subtle' },
};

export function countByStatus(runs: Run[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of runs) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}

/** Durations in seconds of finished runs. */
export function durations(runs: Run[]): number[] {
  return runs
    .filter((r) => r.finished_at)
    .map((r) => (new Date(r.finished_at!).getTime() - new Date(r.started_at).getTime()) / 1000)
    .filter((s) => Number.isFinite(s) && s >= 0)
    .sort((a, b) => a - b);
}

export function percentile(sorted: number[], p: number): number | undefined {
  if (!sorted.length) return undefined;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function formatSeconds(s: number | undefined): string {
  if (s === undefined) return '—';
  if (s < 1) return '<1s';
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
}

/** Share of finished runs that succeeded, 0–100, or undefined when none finished. */
export function successRate(counts: Record<string, number>): number | undefined {
  const ok = counts.SUCCEEDED ?? 0;
  const finished = ok + (counts.FAILED ?? 0) + (counts.CANCELED ?? 0);
  return finished ? Math.round((ok / finished) * 100) : undefined;
}

export interface TimeBucket {
  start: Date;
  label: string;
  counts: Record<string, number>;
  total: number;
}

/** Groups runs by start time into `count` hourly or daily buckets ending now. */
export function bucketRuns(runs: Run[], unit: 'hour' | 'day', count: number, now = new Date()): TimeBucket[] {
  const ms = unit === 'hour' ? 3_600_000 : 86_400_000;
  const end = new Date(now);
  if (unit === 'hour') end.setMinutes(0, 0, 0);
  else end.setHours(0, 0, 0, 0);
  const buckets: TimeBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(end.getTime() - i * ms);
    buckets.push({
      start,
      label: unit === 'hour' ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : start.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      counts: {},
      total: 0,
    });
  }
  const first = buckets[0].start.getTime();
  for (const r of runs) {
    const t = new Date(r.started_at).getTime();
    const idx = Math.floor((t - first) / ms);
    if (idx < 0 || idx >= buckets.length) continue;
    buckets[idx].counts[r.status] = (buckets[idx].counts[r.status] ?? 0) + 1;
    buckets[idx].total++;
  }
  return buckets;
}

/** Most frequent failure classes among failed runs. */
export function topFailures(runs: Run[], limit = 5): Array<{ key: string; count: number; example: Run }> {
  const map = new Map<string, { count: number; example: Run }>();
  for (const r of runs) {
    if (r.status !== 'FAILED') continue;
    const key = r.failure_class || r.failure_phase || 'unclassified';
    const cur = map.get(key);
    map.set(key, { count: (cur?.count ?? 0) + 1, example: cur?.example ?? r });
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count).slice(0, limit);
}
