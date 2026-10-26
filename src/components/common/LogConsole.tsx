import React, { useState, useRef, useEffect } from 'react';
import { RunEvent } from '@/api/types';
import { ArrowDown, Check, Copy, Download, Search } from 'lucide-react';
import { Button } from './Button';

interface LogConsoleProps {
  events: RunEvent[];
  connected: boolean;
  runId: string;
}

export const LogConsole: React.FC<LogConsoleProps> = ({ events, connected, runId }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const filteredEvents = events.filter((evt) => {
    const levelMatch =
      filterLevel === 'ALL' || evt.level?.toUpperCase() === filterLevel;
    const text = `${evt.message} ${evt.level} ${evt.id}`.toLowerCase();
    const searchMatch = !searchTerm || text.includes(searchTerm.toLowerCase());
    return levelMatch && searchMatch;
  });

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const handleExportLog = () => {
    const logText = filteredEvents
      .map((e) => `[${e.ts || new Date().toISOString()}] [${e.level || 'INFO'}] ${e.message}`)
      .join('\n');
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `run-${runId}-logs.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLogs = () => {
    const logText = filteredEvents
      .map((e) => `[${e.ts || new Date().toISOString()}] [${e.level || 'INFO'}] ${e.message}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const levelStyle = (level: string) => {
    switch ((level || 'INFO').toUpperCase()) {
      case 'ERROR':
        return 'text-danger';
      case 'WARN':
        return 'text-warn';
      default:
        return 'text-fg-subtle';
    }
  };

  return (
    <section className="rounded-lg border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-fg">Events</h2>
          <span className="text-xs tabular-nums text-fg-subtle">
            {filteredEvents.length === events.length ? events.length : `${filteredEvents.length} of ${events.length}`}
          </span>
          {connected && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent ring-1 ring-inset ring-accent/25">
              <span className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" aria-hidden />
              Live
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Filter by level" className="inline-flex rounded-md border border-line bg-canvas p-0.5">
            {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                role="radio"
                aria-checked={filterLevel === lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`h-7 cursor-pointer rounded px-2.5 text-xs transition-colors ${filterLevel === lvl ? 'bg-raised font-medium text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                {lvl === 'ALL' ? 'All' : lvl.charAt(0) + lvl.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              type="search"
              aria-label="Search events"
              placeholder="Search events"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-full rounded-md sm:w-48 border border-line bg-canvas pl-8 pr-3 text-xs text-fg placeholder:text-fg-subtle/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-fg-muted">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="h-3.5 w-3.5 accent-[rgb(var(--accent))]" />
            <ArrowDown className="h-3 w-3" aria-hidden /> Follow
          </label>
          <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={handleCopyLogs}>{copied ? 'Copied' : 'Copy'}</Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExportLog}>Export</Button>
        </div>
      </header>

      <div ref={logContainerRef} className="h-96 select-text overflow-y-auto bg-canvas/60 px-2 py-2 font-mono text-xs" role="log" aria-live="off">
        {filteredEvents.map((evt, idx) => (
          <div key={evt.id || idx} className="flex flex-wrap items-start gap-x-3 rounded px-3 py-1 hover:bg-raised/40 sm:flex-nowrap">
            <span className="w-20 flex-shrink-0 select-none tabular-nums text-fg-subtle">{evt.ts ? new Date(evt.ts).toLocaleTimeString() : '—'}</span>
            <span className={`w-12 flex-shrink-0 select-none font-medium ${levelStyle(evt.level)}`}>{(evt.level || 'INFO').toUpperCase()}</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words leading-relaxed text-fg">{evt.message}</span>
          </div>
        ))}
        {filteredEvents.length === 0 && (
          <p className="py-16 text-center font-sans text-sm text-fg-subtle">
            {events.length ? 'No events match this filter.' : 'Waiting for events…'}
          </p>
        )}
      </div>
    </section>
  );
};
