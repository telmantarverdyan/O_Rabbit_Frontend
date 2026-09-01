import React, { useState, useRef, useEffect } from 'react';
import { RunEvent } from '@/api/types';
import {
  Terminal,
  Search,
  Download,
  Filter,
  ArrowDown,
  Copy,
  Check,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
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

  const getLevelBadge = (level: string) => {
    const lvl = level?.toUpperCase() || 'INFO';
    switch (lvl) {
      case 'ERROR':
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-950 text-rose-400 border border-rose-600/40">
            [ERR]
          </span>
        );
      case 'WARN':
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-600/40">
            [WRN]
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-700/40">
            [INF]
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-surface-border bg-[#030805] p-4 font-mono text-xs shadow-terminal-glow space-y-3">
      {/* Terminal Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3 text-emerald-400/80">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="font-bold text-emerald-200 glow-emerald">EVENT STREAM TTY</span>
          <span className="text-[10px] text-emerald-600">
            ({filteredEvents.length} / {events.length} lines)
          </span>
          {connected && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 shadow-terminal-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-terminal-blink" />
              LIVE_SSE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? Check : Copy}
            onClick={handleCopyLogs}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleExportLog}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Level Filters */}
        <div className="flex items-center gap-1 bg-surface-darker p-1 rounded-lg border border-surface-border">
          {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition font-mono ${
                filterLevel === lvl
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-terminal-sm'
                  : 'text-emerald-600 hover:text-emerald-300'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search & Auto-scroll Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3 w-3 text-emerald-600" />
            <input
              type="text"
              placeholder="grep logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface-darker border border-surface-border rounded-lg pl-7 pr-3 py-1 text-xs text-emerald-100 placeholder-emerald-800 focus:outline-none focus:border-emerald-400 w-44 sm:w-56 font-mono"
            />
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-emerald-500/70 cursor-pointer select-none font-mono">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-terminal-dark border-emerald-900 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <span className="flex items-center gap-1">
              <ArrowDown className="h-3 w-3" /> Auto-scroll
            </span>
          </label>
        </div>
      </div>

      {/* Log Output Terminal Window */}
      <div
        ref={logContainerRef}
        className="h-96 overflow-y-auto space-y-1 pt-2 font-mono text-[11px] bg-[#020503] p-3 rounded-lg border border-surface-border select-text"
      >
        {filteredEvents.map((evt, idx) => (
          <div
            key={evt.id || idx}
            className="flex items-start gap-2.5 py-0.5 hover:bg-emerald-950/30 rounded px-1 transition group"
          >
            <span className="text-emerald-700 select-none text-[10px]">
              {String(idx + 1).padStart(3, '0')}
            </span>
            <span className="text-emerald-600/80 flex-shrink-0 select-none text-[10px]">
              {evt.ts ? new Date(evt.ts).toLocaleTimeString() : '—'}
            </span>
            <span className="flex-shrink-0">{getLevelBadge(evt.level)}</span>
            <span className="text-emerald-200/90 flex-1 break-all leading-relaxed font-mono">
              {evt.message}
            </span>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="py-16 text-center text-emerald-700 font-mono text-xs">
            [No log events match filter criteria]
          </div>
        )}
      </div>
    </div>
  );
};

