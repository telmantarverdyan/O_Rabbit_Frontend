import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ArrowDownToLine, Copy, Download, Eraser, History, Maximize2, Minimize2, Pause, Play, RefreshCw, WrapText } from 'lucide-react';
import { CONTAINER_TAIL, fetchContainers, fetchLogPage, LogFilter, LogSource, useLogStream } from '@/api/logs';
import { fetchServers } from '@/api/remoteOps';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/common/Button';
import { PageTitle, Segmented } from '@/components/common/QueryState';
import { useToast } from '@/components/common/Toast';
import { FilterValues, LogFilters, TIME_PRESETS, TimePreset } from '@/components/logs/LogFilters';
import { LogRow } from '@/components/logs/LogRow';
import { VirtualLogList } from '@/components/logs/VirtualLogList';
import { OpsTokenCallout } from '@/components/workers/OpsTokenCallout';
import { LOG_LEVELS, LogEntry, LogLevel, matchesFilter, toJson, toText } from '@/utils/logs';

type SourceKind = LogSource['kind'];

/** The viewer keeps at most this many entries; older ones are dropped (they stay on the server). */
const MAX_ENTRIES = 20_000;
/** While paused, new entries wait here (newest kept). */
const MAX_PENDING = 5_000;
/** "Download all" stops here so a broad filter cannot flood the browser. */
const MAX_EXPORT = 10_000;

const SOURCES: Array<{ value: SourceKind; label: string }> = [
  { value: 'events', label: 'Runs · Jobs · Tasks' },
  { value: 'master', label: 'Master' },
  { value: 'container', label: 'Containers' },
];

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reads every filter from the URL, so switching sources keeps them and links can open a filtered view. */
function useLogParams() {
  const [params, setParams] = useSearchParams();
  const values: FilterValues = {
    levels: params.getAll('level').filter((l): l is LogLevel => (LOG_LEVELS as string[]).includes(l)),
    q: params.get('q') ?? '',
    time: (params.get('time') as TimePreset) ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    run: params.get('run') ?? '',
    job: params.get('job') ?? '',
    task: params.get('task') ?? '',
    worker: params.get('worker') ?? '',
  };
  const source = (params.get('source') as SourceKind) || 'events';
  const server = params.get('server') ?? '';
  const container = params.get('container') ?? '';

  const update = useCallback(
    (patch: Record<string, string | string[] | undefined>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            next.delete(k);
            if (Array.isArray(v)) v.forEach((x) => next.append(k, x));
            else if (v) next.set(k, v);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );
  return { values, source, server, container, update };
}

/** Converts the UI filter values into what the server understands. */
function toServerFilter(v: FilterValues): LogFilter {
  let since = '';
  let until = '';
  const preset = TIME_PRESETS.find((p) => p.value === v.time);
  if (preset?.ms) since = new Date(Date.now() - preset.ms).toISOString();
  if (v.time === 'custom') {
    if (v.from) since = new Date(v.from).toISOString();
    if (v.to) until = new Date(v.to).toISOString();
  }
  return { levels: v.levels, q: v.q, since, until, runId: v.run, jobId: v.job, taskId: v.task, workerId: v.worker };
}

export const Logs: React.FC = () => {
  const toast = useToast();
  const { session } = useAuth();
  const { values, source: sourceKind, server, container, update } = useLogParams();
  const hasOps = !!session?.opsToken;

  // ---- Source ----
  const serversQuery = useQuery({ queryKey: ['ops', 'servers'], queryFn: fetchServers, enabled: sourceKind === 'container' && hasOps });
  const containersQuery = useQuery({ queryKey: ['ops', 'containers', server], queryFn: () => fetchContainers(server), enabled: sourceKind === 'container' && hasOps && !!server });
  const containerInfo = containersQuery.data?.find((c) => c.id === container || c.name === container);
  const source: LogSource | null = useMemo(() => {
    if (sourceKind === 'events') return { kind: 'events' };
    if (sourceKind === 'master') return { kind: 'master' };
    if (hasOps && server && container) return { kind: 'container', serverId: server, containerId: container, label: containerInfo?.name ?? container };
    return null;
  }, [sourceKind, server, container, containerInfo?.name, hasOps]);

  // Time presets are relative: computing "since" once per filter change keeps the stream stable.
  const valuesKey = JSON.stringify(values);
  const serverFilter = useMemo(() => toServerFilter(values), [valuesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const clientSide = sourceKind === 'container';

  // ---- Data ----
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastSelected = useRef<number | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]); // oldest first
  const [nextBefore, setNextBefore] = useState(0);
  const [total, setTotal] = useState<{ n: number; capped: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const [dropped, setDropped] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const loadId = useRef(0);

  const append = useCallback((list: LogEntry[]) => {
    setEntries((prev) => {
      const next = prev.length + list.length > MAX_ENTRIES ? [...prev, ...list].slice(-MAX_ENTRIES) : [...prev, ...list];
      if (next.length < prev.length + list.length) setDropped((d) => d + prev.length + list.length - next.length);
      return next;
    });
  }, []);

  const sourceKey = JSON.stringify(source);
  useEffect(() => {
    if (!source) {
      setEntries([]);
      return;
    }
    const id = ++loadId.current;
    setLoading(true);
    setError('');
    setEntries([]);
    setDropped(0);
    setExpanded(new Set());
    setSelected(new Set());
    fetchLogPage(source, serverFilter, 0, true)
      .then((page) => {
        if (id !== loadId.current) return; // a newer load replaced this one
        setEntries([...page.entries].reverse());
        setNextBefore(page.nextBefore);
        setTotal(page.total !== undefined ? { n: page.total, capped: !!page.totalCapped } : null);
      })
      .catch((err) => id === loadId.current && setError(errorMessage(err)))
      .finally(() => id === loadId.current && setLoading(false));
  }, [sourceKey, serverFilter, reloadToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOlder = useCallback(async () => {
    if (!source || !nextBefore || loadingOlder || loading) return;
    setLoadingOlder(true);
    try {
      const page = await fetchLogPage(source, serverFilter, nextBefore);
      setEntries((prev) => [...[...page.entries].reverse(), ...prev].slice(0, MAX_ENTRIES));
      setNextBefore(page.nextBefore);
    } catch (err) {
      toast.error(errorMessage(err), 'Could not load older logs');
    } finally {
      setLoadingOlder(false);
    }
  }, [source, serverFilter, nextBefore, loadingOlder, loading, toast]);

  // ---- Live stream ----
  const [live, setLive] = useState(true);
  const [follow, setFollow] = useState(true);
  const [pending, setPending] = useState<LogEntry[]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;
  const latestSeq = useMemo(() => entries.reduce((m, e) => Math.max(m, e.seq ?? 0), 0), [entries]);
  const onStreamEntries = useCallback(
    (list: LogEntry[]) => {
      if (liveRef.current) append(list);
      else setPending((p) => [...p, ...list].slice(-MAX_PENDING));
    },
    [append]
  );
  // Stream only after history is in, so it resumes right after the newest loaded entry.
  const stream = useLogStream({ source: source ?? { kind: 'events' }, filter: serverFilter, enabled: !!source && !loading && !error, afterSeq: latestSeq, onEntries: onStreamEntries });

  const resume = () => {
    append(pending);
    setPending([]);
    setLive(true);
    setFollow(true);
  };

  // ---- View ----
  const [wrap, setWrap] = useState(false);
  const [height, setHeight] = useState(560);
  const [fullscreen, setFullscreen] = useState(false);

  // Container logs are filtered here; events and master logs were filtered by the server.
  const levelSet = useMemo(() => new Set(values.levels), [values.levels]);
  const visible = useMemo(() => (clientSide ? entries.filter((e) => matchesFilter(e, levelSet, values.q)) : entries), [entries, clientSide, levelSet, values.q]);

  const onFilterChange = useCallback(
    (patch: Partial<FilterValues>) => {
      update(Object.fromEntries(Object.entries(patch).map(([k, v]) => [k === 'levels' ? 'level' : k, v as string | string[]])));
    },
    [update]
  );

  const toggleSelect = (index: number, shift: boolean) => {
    const key = visible[index].key;
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && lastSelected.current !== null) {
        const [a, b] = [Math.min(lastSelected.current, index), Math.max(lastSelected.current, index)];
        for (let i = a; i <= b; i++) next.add(visible[i].key);
      } else if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    lastSelected.current = index;
  };
  const selectedEntries = visible.filter((e) => selected.has(e.key));

  const copy = useCallback(
    (text: string, what: string) => {
      navigator.clipboard.writeText(text).then(
        () => toast.success(`${what} copied.`),
        (err) => toast.error(String(err), 'Copy failed')
      );
    },
    [toast]
  );

  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
  const exportEntries = (list: LogEntry[], format: 'txt' | 'json') =>
    format === 'txt' ? download(`orabbit-logs-${stamp()}.txt`, toText(list), 'text/plain') : download(`orabbit-logs-${stamp()}.json`, toJson(list), 'application/json');

  const [exporting, setExporting] = useState(false);
  const exportAll = async (format: 'txt' | 'json') => {
    if (!source) return;
    if (source.kind === 'container') {
      exportEntries(visible, format);
      return;
    }
    setExporting(true);
    try {
      const all: LogEntry[] = [];
      let before = 0;
      do {
        const page = await fetchLogPage(source, serverFilter, before);
        all.push(...page.entries);
        before = page.nextBefore;
      } while (before && all.length < MAX_EXPORT);
      exportEntries(all.slice(0, MAX_EXPORT).reverse(), format);
      if (all.length >= MAX_EXPORT) toast.info(`Exported the newest ${MAX_EXPORT.toLocaleString()} matching entries. Narrow the filters for older ones.`);
    } catch (err) {
      toast.error(errorMessage(err), 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const clearViewer = () => {
    setEntries([]);
    setPending([]);
    setSelected(new Set());
    setExpanded(new Set());
    setNextBefore(0);
    setDropped(0);
  };

  // Resize by dragging the handle under the panel.
  const startResize = (ev: React.PointerEvent) => {
    const startY = ev.clientY;
    const startH = height;
    const move = (e: PointerEvent) => setHeight(Math.min(Math.max(240, startH + e.clientY - startY), window.innerHeight - 120));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const streamLabel = !source ? '' : !live ? 'Paused' : stream.state === 'live' ? 'Live' : stream.state === 'reconnecting' ? `Reconnecting${stream.retries > 1 ? ` (try ${stream.retries})` : ''}…` : stream.state === 'error' ? 'Stream unavailable' : 'Connecting…';
  const streamTone = !live ? 'text-warn' : stream.state === 'live' ? 'text-accent' : stream.state === 'error' ? 'text-danger' : 'text-info';

  const servers = serversQuery.data ?? [];
  const containers = containersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <PageTitle title="Logs" subtitle="Live and historical logs from runs, the master and service containers. Secrets are masked by the master." />

      <div className="flex flex-wrap items-end gap-3">
        <Segmented<SourceKind> label="Source" value={sourceKind} onChange={(v) => update({ source: v })} options={SOURCES} />
        {sourceKind === 'container' && hasOps && (
          <>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-fg-muted">Server</span>
              <select value={server} onChange={(e) => update({ server: e.target.value, container: '' })} className="h-9 cursor-pointer rounded-md border border-line bg-canvas px-2 text-sm text-fg focus:border-accent focus:outline-none">
                <option value="" className="bg-card">{serversQuery.isLoading ? 'Loading…' : servers.length ? 'Choose a server' : 'No servers registered'}</option>
                {servers.map((s) => <option key={s.id} value={s.id} className="bg-card">{s.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-fg-muted">Container</span>
              <select value={container} onChange={(e) => update({ container: e.target.value })} disabled={!server} className="h-9 max-w-xs cursor-pointer rounded-md border border-line bg-canvas px-2 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-50">
                <option value="" className="bg-card">{containersQuery.isLoading ? 'Loading…' : 'Choose a container'}</option>
                {[...containers]
                  .sort((a, b) => Number(/orabbit/.test(b.name)) - Number(/orabbit/.test(a.name)) || a.name.localeCompare(b.name))
                  .map((c) => <option key={c.id} value={c.name} className="bg-card">{c.name} · {c.state}</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      {sourceKind === 'container' && !hasOps ? (
        <section className="rounded-md border border-line bg-card p-5">
          <OpsTokenCallout />
        </section>
      ) : (
        <section
          className={clsx('flex flex-col rounded-md border border-line bg-card', fullscreen && 'fixed inset-2 z-50 shadow-2xl shadow-black/60')}
          aria-label="Log viewer"
        >
          <div className="space-y-2 border-b border-line p-3">
            <LogFilters values={values} onChange={onFilterChange} entityFilters={sourceKind === 'events'} timeFilters={sourceKind !== 'container'} />
            <div className="flex flex-wrap items-center gap-1.5">
              {live ? (
                <Button variant="secondary" size="sm" icon={Pause} onClick={() => setLive(false)} disabled={!source}>Pause</Button>
              ) : (
                <Button size="sm" icon={Play} onClick={resume}>Resume{pending.length ? ` (${pending.length.toLocaleString()} new)` : ''}</Button>
              )}
              <Button variant={follow ? 'primary' : 'secondary'} size="sm" icon={ArrowDownToLine} aria-pressed={follow} onClick={() => setFollow((f) => !f)}>Auto-scroll</Button>
              <Button variant={wrap ? 'primary' : 'secondary'} size="sm" icon={WrapText} aria-pressed={wrap} onClick={() => setWrap((w) => !w)}>Wrap</Button>
              <span className="mx-1 h-5 w-px bg-line" aria-hidden />
              {selected.size > 0 ? (
                <>
                  <span className="text-xs text-fg-muted">{selected.size} selected</span>
                  <Button variant="secondary" size="sm" icon={Copy} onClick={() => copy(toText(selectedEntries), `${selected.size} entries`)}>Copy</Button>
                  <Button variant="secondary" size="sm" icon={Download} onClick={() => exportEntries(selectedEntries, 'txt')}>TXT</Button>
                  <Button variant="secondary" size="sm" icon={Download} onClick={() => exportEntries(selectedEntries, 'json')}>JSON</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Unselect</Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" icon={Download} loading={exporting} onClick={() => exportAll('txt')} disabled={!source} title="Download every matching entry (up to 10,000)">TXT</Button>
                  <Button variant="secondary" size="sm" icon={Download} loading={exporting} onClick={() => exportAll('json')} disabled={!source} title="Download every matching entry (up to 10,000)">JSON</Button>
                </>
              )}
              <Button variant="ghost" size="sm" icon={Eraser} onClick={clearViewer} title="Clear the viewer (logs stay on the server)">Clear</Button>
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => setReloadToken((t) => t + 1)} aria-label="Reload history">{''}</Button>
              <Button variant="ghost" size="sm" icon={fullscreen ? Minimize2 : Maximize2} onClick={() => setFullscreen((f) => !f)} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}>{''}</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5 text-xs text-fg-muted" aria-live="polite">
            <span>
              {visible.length.toLocaleString()} shown
              {total && !clientSide && <> · {total.n.toLocaleString()}{total.capped ? '+' : ''} matching</>}
              {clientSide && <> · newest {CONTAINER_TAIL.toLocaleString()} lines, filtered in the browser</>}
              {dropped > 0 && <> · {dropped.toLocaleString()} older dropped from view</>}
            </span>
            {source && (
              <span className={clsx('flex items-center gap-1.5', streamTone)} title={stream.error || undefined}>
                <span className={clsx('h-1.5 w-1.5 rounded-full bg-current', live && stream.state === 'live' && 'motion-safe:animate-pulse')} aria-hidden />
                {streamLabel}
                {stream.error && stream.state !== 'live' && <span className="text-fg-subtle">· {stream.error}</span>}
              </span>
            )}
          </div>

          {/* In a flex column, flex-basis wins over height: grow only in full screen, otherwise keep the fixed (resizable) height. */}
          <div className={clsx('relative flex min-h-0 flex-col', fullscreen ? 'flex-1' : 'flex-none')} style={fullscreen ? undefined : { height }}>
            {nextBefore > 0 && !loading && (
              <button type="button" onClick={loadOlder} className="flex items-center justify-center gap-1.5 border-b border-line/60 py-1 text-xs text-fg-muted hover:bg-raised/50 hover:text-accent">
                <History className="h-3.5 w-3.5" aria-hidden /> {loadingOlder ? 'Loading older…' : 'Load older entries'}
              </button>
            )}
            {!source ? (
              <p className="m-auto text-sm text-fg-subtle">Choose a server and a container to see its logs.</p>
            ) : loading ? (
              <div className="space-y-1.5 p-3" aria-busy="true" aria-label="Loading logs">
                {Array.from({ length: 10 }, (_, i) => <div key={i} className="h-5 animate-pulse rounded bg-raised/60" style={{ width: `${60 + ((i * 37) % 40)}%` }} />)}
              </div>
            ) : error ? (
              <div role="alert" className="m-auto max-w-lg space-y-3 p-6 text-center">
                <p className="break-words text-sm text-danger">{error}</p>
                <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setReloadToken((t) => t + 1)}>Try again</Button>
              </div>
            ) : visible.length === 0 ? (
              <p className="m-auto text-sm text-fg-subtle">{entries.length ? 'No entries match the filters.' : live ? 'No logs yet. New entries appear here live.' : 'No logs.'}</p>
            ) : (
              <VirtualLogList
                className="min-h-0 flex-1 bg-canvas/40"
                items={visible}
                getKey={(e) => e.key}
                wrap={wrap}
                follow={follow && live}
                onScrollPosition={(atBottom) => setFollow(atBottom)}
                onReachTop={nextBefore ? loadOlder : undefined}
                renderRow={(e, i) => (
                  <LogRow
                    entry={e}
                    query={values.q}
                    wrap={wrap}
                    expanded={expanded.has(e.key)}
                    selected={selected.has(e.key)}
                    onToggleExpand={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(e.key)) next.delete(e.key);
                        else next.add(e.key);
                        return next;
                      })
                    }
                    onToggleSelect={(shift) => toggleSelect(i, shift)}
                    onCopy={copy}
                  />
                )}
              />
            )}
            {!follow && live && visible.length > 0 && (
              <button
                type="button"
                onClick={() => setFollow(true)}
                className="absolute bottom-3 right-5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-accent/60 bg-card px-3 py-1.5 text-xs text-accent shadow-lg hover:bg-raised"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden /> Jump to latest
              </button>
            )}
          </div>
          {!fullscreen && (
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize log panel"
              tabIndex={0}
              onPointerDown={startResize}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') setHeight((h) => Math.min(h + 40, window.innerHeight - 120));
                if (e.key === 'ArrowUp') setHeight((h) => Math.max(h - 40, 240));
              }}
              className="h-2 cursor-row-resize rounded-b-md border-t border-line bg-raised/40 hover:bg-accent/20 focus:bg-accent/20"
            />
          )}
        </section>
      )}
    </div>
  );
};
