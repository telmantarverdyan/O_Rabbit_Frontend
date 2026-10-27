import { useEffect, useRef, useState } from 'react';
import { API_PREFIX, AuthKind, apiClient, masterHeaders, opsClient } from './client';
import { computeBackoffDelay, INITIAL_RETRY_DELAY_MS } from './sse';
import { EventRecordJson, fromContainerLine, fromEvent, fromMaster, LogEntry, LogLevel, MasterLogJson } from '@/utils/logs';

/** Filters the server applies (events: all; master: levels, q, time). */
export interface LogFilter {
  levels: LogLevel[];
  q: string;
  since: string; // ISO or ''
  until: string;
  runId: string;
  jobId: string;
  taskId: string;
  workerId: string;
}

export type LogSource =
  | { kind: 'events' }
  | { kind: 'master' }
  | { kind: 'container'; serverId: string; containerId: string; label: string };

export interface LogPage {
  entries: LogEntry[]; // newest first, as the server returns them
  nextBefore: number; // 0 = no older page
  total?: number;
  totalCapped?: boolean;
}

export const LOG_PAGE_SIZE = 200;
/** Container logs have no server-side paging: this many recent lines are loaded. */
export const CONTAINER_TAIL = 2000;

function params(source: LogSource, f: LogFilter, extra: Record<string, string | number> = {}): URLSearchParams {
  const p = new URLSearchParams();
  for (const l of f.levels) p.append('level', l);
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.since) p.set('since', f.since);
  if (f.until) p.set('until', f.until);
  if (source.kind === 'events') {
    if (f.runId.trim()) p.set('run_id', f.runId.trim());
    if (f.jobId.trim()) p.set('job_id', f.jobId.trim());
    if (f.taskId.trim()) p.set('task_id', f.taskId.trim());
    if (f.workerId.trim()) p.set('worker_id', f.workerId.trim());
  }
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p;
}

/** One page of history, newest first. `before` pages backwards. */
export async function fetchLogPage(source: LogSource, f: LogFilter, before = 0, withCount = false): Promise<LogPage> {
  const extra: Record<string, string | number> = { limit: LOG_PAGE_SIZE };
  if (before) extra.before = before;
  if (source.kind === 'events') {
    if (withCount) extra.count = 1;
    const res = await apiClient<{ items: EventRecordJson[]; next_before: number; total?: number; total_capped?: boolean }>(`events?${params(source, f, extra)}`);
    return { entries: (res.items ?? []).map(fromEvent), nextBefore: res.next_before, total: res.total, totalCapped: res.total_capped };
  }
  if (source.kind === 'master') {
    const res = await apiClient<{ items: MasterLogJson[] | null; next_before: number; total: number }>(`logs/master?${params(source, f, extra)}`);
    return { entries: (res.items ?? []).map(fromMaster), nextBefore: res.next_before, total: res.total };
  }
  const res = await opsClient<{ items: Array<{ line: string }> | null }>(
    `servers/${encodeURIComponent(source.serverId)}/containers/${encodeURIComponent(source.containerId)}/logs?tail=${CONTAINER_TAIL}`
  );
  const lines = res.items ?? [];
  // Oldest first from docker; reverse to match the other sources.
  return { entries: lines.map((l, i) => fromContainerLine(l.line, source.label, i)).reverse(), nextBefore: 0, total: lines.length };
}

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

export async function fetchContainers(serverId: string): Promise<ContainerSummary[]> {
  return (await opsClient<{ items: ContainerSummary[] | null }>(`servers/${encodeURIComponent(serverId)}/containers`)).items ?? [];
}

export type StreamState = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'error';

interface StreamOptions {
  source: LogSource;
  filter: LogFilter;
  enabled: boolean;
  /** Resume point: only entries after this sequence (events, master). */
  afterSeq: number;
  onEntries: (entries: LogEntry[]) => void;
}

/**
 * Live tail of a log source over SSE (fetch + ReadableStream so it can send
 * the auth headers). Reconnects with backoff and resumes after the last
 * sequence it delivered, so nothing is duplicated or lost for events and
 * master logs. Container streams restart from "now" (docker logs -f has no
 * resume point).
 */
export function useLogStream({ source, filter, enabled, afterSeq, onEntries }: StreamOptions): { state: StreamState; error: string; retries: number } {
  const [state, setState] = useState<StreamState>('idle');
  const [error, setError] = useState('');
  const [retries, setRetries] = useState(0);
  const onEntriesRef = useRef(onEntries);
  onEntriesRef.current = onEntries;
  const afterRef = useRef(afterSeq);
  afterRef.current = Math.max(afterRef.current, afterSeq);
  const sourceKey = JSON.stringify(source);
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      return;
    }
    let cancelled = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = INITIAL_RETRY_DELAY_MS;
    let attempt = 0;
    let lineNo = 0;
    afterRef.current = afterSeq;

    const connect = async () => {
      if (cancelled) return;
      controller = new AbortController();
      setState(attempt ? 'reconnecting' : 'connecting');
      let auth: AuthKind = 'api';
      let url: string;
      if (source.kind === 'container') {
        auth = 'ops';
        url = `${API_PREFIX}/servers/${encodeURIComponent(source.serverId)}/containers/${encodeURIComponent(source.containerId)}/logs/stream?tail=0`;
      } else {
        const p = params(source, filter, afterRef.current ? { after: afterRef.current } : {});
        url = `${API_PREFIX}/${source.kind === 'events' ? 'events' : 'logs/master'}/stream?${p}`;
      }
      try {
        const headers = masterHeaders(undefined, auth);
        headers.set('Accept', 'text/event-stream');
        const res = await fetch(url, { headers, signal: controller.signal });
        if (!res.ok || !res.body) {
          let message = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            message = body?.error?.message ?? body?.error ?? message;
          } catch {
            // keep the status text
          }
          // 4xx other than 429 will not fix itself by retrying.
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            setError(message);
            setState('error');
            return;
          }
          throw new Error(message);
        }
        setState('live');
        setError('');
        attempt = 0;
        delay = INITIAL_RETRY_DELAY_MS;
        setRetries(0);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          // A stream replaced by a new source or filter must never deliver into the new view.
          if (cancelled) return;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          const batch: LogEntry[] = [];
          for (const frame of frames) {
            const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            try {
              const data = JSON.parse(dataLine.slice(5).trim());
              if (source.kind === 'events') batch.push(fromEvent(data as EventRecordJson));
              else if (source.kind === 'master') batch.push(fromMaster(data as MasterLogJson));
              else if (typeof data?.data?.line === 'string') batch.push(fromContainerLine(data.data.line, source.label, 1_000_000 + lineNo++));
            } catch {
              // Skip a malformed frame; the stream continues.
            }
          }
          if (batch.length && !cancelled) {
            const lastSeq = batch.reduce((m, e) => Math.max(m, e.seq ?? 0), 0);
            if (lastSeq) afterRef.current = Math.max(afterRef.current, lastSeq);
            onEntriesRef.current(batch);
          }
        }
        throw new Error('stream closed by the server');
      } catch (err) {
        if (cancelled || (err as Error).name === 'AbortError') return;
        attempt++;
        setRetries(attempt);
        setError((err as Error).message);
        setState('reconnecting');
        delay = computeBackoffDelay(delay);
        timer = setTimeout(connect, delay);
      }
    };
    connect();
    return () => {
      cancelled = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
    // Reconnect when the source or filters change; afterSeq is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sourceKey, filterKey]);

  return { state, error, retries };
}
