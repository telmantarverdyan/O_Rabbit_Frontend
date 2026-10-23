export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatNumber(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString();
}

export function formatTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString();
}

/** Duration between two timestamps; an unfinished run counts up to now. */
export function formatDuration(start: string | null | undefined, end?: string | null): string {
  if (!start) return '—';
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : '—';
}

/** Splits "a, b ,c" into ["a","b","c"]. */
export function splitList(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Parses a JSON textarea. Empty input gives `undefined`; invalid JSON throws
 * an Error naming the field so the form can show it.
 */
export function parseJsonField<T = unknown>(raw: string, field: string): T | undefined {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`${field} is not valid JSON: ${(err as Error).message}`);
  }
}

export const ACTIVE_RUN_STATUSES = new Set(['PLANNING', 'RUNNING', 'COMMITTING']);
