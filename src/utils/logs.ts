// Log viewer model: every source (events, master, containers) becomes a LogEntry.

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
export const LEVEL_LABEL: Record<LogLevel, string> = { DEBUG: 'Debug', INFO: 'Info', WARN: 'Warning', ERROR: 'Error', CRITICAL: 'Critical' };

export type LogSourceKind = 'events' | 'master' | 'container';

export interface LogEntry {
  /** Unique within the viewer; used for selection and React keys. */
  key: string;
  /** Server sequence number (events, master); orders and resumes streams. */
  seq?: number;
  /** ISO timestamp, kept with its original precision. */
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
  fields?: Record<string, unknown>;
  runId?: string;
  taskId?: string;
  jobId?: string;
  workerId?: string;
}

export function normalizeLevel(raw: unknown): LogLevel {
  const up = String(raw ?? '').trim().toUpperCase();
  if (up === 'WARNING' || up === 'WARN') return 'WARN';
  if (up === 'ERROR' || up === 'ERR') return 'ERROR';
  if (up === 'CRITICAL' || up === 'FATAL' || up === 'PANIC') return 'CRITICAL';
  if (up === 'DEBUG' || up === 'TRACE') return 'DEBUG';
  return 'INFO';
}

// ---- Masking: the master already masks; this is a second line of defense. ----

const URL_CREDENTIALS = /(:\/\/[^/\s:@]*:)[^@\s]*@/g;
const AUTH_HEADER = /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const KEY_VALUE = /("?\b[\w.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential|dsn)[\w.-]*"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&}]+)/gi;
const SENSITIVE_KEY = /(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential|authorization|^dsn$|_dsn$)/i;

export function maskText(s: string): string {
  return s
    .replace(URL_CREDENTIALS, '$1***@')
    .replace(AUTH_HEADER, '$1 ***')
    .replace(KEY_VALUE, (_m, key: string, value: string) => key + (value.startsWith('"') ? '"***"' : value.startsWith("'") ? "'***'" : '***'));
}

export function maskValue(v: unknown): unknown {
  if (typeof v === 'string') return maskText(v);
  if (Array.isArray(v)) return v.map(maskValue);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, SENSITIVE_KEY.test(k) && val !== null ? '***' : maskValue(val)]));
  }
  return v;
}

// ---- Normalizing each source ----

export interface EventRecordJson {
  seq: number;
  id: string;
  run_id: string;
  task_id?: string | null;
  ts: string;
  level: string;
  message: string;
  fields_json?: unknown;
  job_id?: string;
  worker_id?: string;
}

export function fromEvent(e: EventRecordJson): LogEntry {
  const fields = e.fields_json && typeof e.fields_json === 'object' && Object.keys(e.fields_json as object).length ? (maskValue(e.fields_json) as Record<string, unknown>) : undefined;
  return {
    key: `ev-${e.seq}`,
    seq: e.seq,
    ts: e.ts,
    level: normalizeLevel(e.level),
    source: e.task_id ? 'task' : 'run',
    message: maskText(e.message),
    fields,
    runId: e.run_id || undefined,
    taskId: e.task_id || undefined,
    jobId: e.job_id || undefined,
    workerId: e.worker_id || undefined,
  };
}

export interface MasterLogJson {
  seq: number;
  ts: string;
  level: string;
  message: string;
  attrs?: Record<string, unknown>;
}

export function fromMaster(e: MasterLogJson): LogEntry {
  const attrs = e.attrs && Object.keys(e.attrs).length ? (maskValue(e.attrs) as Record<string, unknown>) : undefined;
  return { key: `m-${e.seq}`, seq: e.seq, ts: e.ts, level: normalizeLevel(e.level), source: 'master', message: maskText(e.message), fields: attrs, ...linksFrom(attrs) };
}

const DOCKER_TS = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))\s?(.*)$/s;
const TEXT_LEVEL = /\b(level=)?(DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL|PANIC)\b/i;

/**
 * Parses one `docker logs --timestamps` line. O_Rabbit services log JSON
 * (slog: time, level, msg, attrs), which becomes structured fields; anything
 * else stays a plain message with a best-effort level.
 */
export function fromContainerLine(line: string, source: string, n: number): LogEntry {
  const m = DOCKER_TS.exec(line);
  let ts = m ? m[1] : new Date().toISOString();
  const rest = (m ? m[2] : line).trimEnd();
  if (rest.startsWith('{')) {
    try {
      const obj = JSON.parse(rest) as Record<string, unknown>;
      const { time, level, msg, ...attrs } = obj;
      if (typeof time === 'string') ts = time;
      const fields = Object.keys(attrs).length ? (maskValue(attrs) as Record<string, unknown>) : undefined;
      return { key: `c-${source}-${n}`, ts, level: normalizeLevel(level), source, message: maskText(String(msg ?? rest)), fields, ...linksFrom(fields) };
    } catch {
      // Not JSON after all: fall through to plain text.
    }
  }
  const lvl = TEXT_LEVEL.exec(rest);
  return { key: `c-${source}-${n}`, ts, level: lvl ? normalizeLevel(lvl[2]) : 'INFO', source, message: maskText(rest) };
}

/** Pulls related IDs out of structured fields so rows can link to them. */
function linksFrom(fields?: Record<string, unknown>): Pick<LogEntry, 'runId' | 'taskId' | 'jobId' | 'workerId'> {
  if (!fields) return {};
  const pick = (...keys: string[]) => {
    for (const k of keys) if (typeof fields[k] === 'string' && fields[k]) return fields[k] as string;
    return undefined;
  };
  return { runId: pick('run_id', 'run'), taskId: pick('task_id', 'task'), jobId: pick('job_id', 'job'), workerId: pick('worker_id', 'worker') };
}

// ---- Display helpers ----

/** "12:04:05.123" with millisecond precision; the full timestamp goes in a tooltip. */
export function formatLogTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** Splits text into parts, marking case-insensitive matches of `query`. */
export function highlightParts(text: string, query: string): Array<{ text: string; match: boolean }> {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const out: Array<{ text: string; match: boolean }> = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  for (;;) {
    const at = lower.indexOf(needle, i);
    if (at < 0) break;
    if (at > i) out.push({ text: text.slice(i, at), match: false });
    out.push({ text: text.slice(at, at + q.length), match: true });
    i = at + q.length;
  }
  if (i < text.length) out.push({ text: text.slice(i), match: false });
  return out.length ? out : [{ text, match: false }];
}

/** Go panics, goroutine dumps, Java/Python traces: shown as a preformatted block. */
export function looksLikeStackTrace(message: string): boolean {
  return /\n/.test(message) && /(goroutine \d+|panic:|\n\s+at |Traceback \(most recent call last\)|\.go:\d+)/.test(message);
}

/** Client-side filter for sources the server cannot filter (container logs). */
export function matchesFilter(e: LogEntry, levels: Set<LogLevel>, query: string): boolean {
  if (levels.size && !levels.has(e.level)) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return e.message.toLowerCase().includes(q) || (!!e.fields && JSON.stringify(e.fields).toLowerCase().includes(q));
}

export function toText(entries: LogEntry[]): string {
  return entries
    .map((e) => {
      const ids = [e.runId && `run=${e.runId}`, e.taskId && `task=${e.taskId}`, e.workerId && `worker=${e.workerId}`].filter(Boolean).join(' ');
      const fields = e.fields ? ` ${JSON.stringify(e.fields)}` : '';
      return `${e.ts} ${e.level.padEnd(8)} [${e.source}] ${e.message}${ids ? ` (${ids})` : ''}${fields}`;
    })
    .join('\n');
}

export function toJson(entries: LogEntry[]): string {
  return JSON.stringify(entries.map(({ key: _key, ...rest }) => rest), null, 2);
}
