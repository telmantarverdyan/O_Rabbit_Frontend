import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronRight, Copy } from 'lucide-react';
import { formatLogTime, highlightParts, LogEntry, LogLevel, looksLikeStackTrace } from '@/utils/logs';
import { shortId } from '@/utils/format';

export const LEVEL_STYLE: Record<LogLevel, { text: string; badge: string; row: string }> = {
  DEBUG: { text: 'text-fg-subtle', badge: 'text-fg-subtle bg-raised', row: '' },
  INFO: { text: 'text-info', badge: 'text-info bg-info/10', row: '' },
  WARN: { text: 'text-warn', badge: 'text-warn bg-warn/10', row: 'bg-warn/[0.03]' },
  ERROR: { text: 'text-danger', badge: 'text-danger bg-danger/10', row: 'bg-danger/[0.05]' },
  CRITICAL: { text: 'text-danger', badge: 'text-canvas bg-danger font-bold', row: 'bg-danger/10' },
};

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => (
  <>
    {highlightParts(text, query).map((p, i) =>
      p.match ? (
        <mark key={i} className="rounded-sm bg-warn/30 px-0.5 text-fg">{p.text}</mark>
      ) : (
        <React.Fragment key={i}>{p.text}</React.Fragment>
      )
    )}
  </>
);

/** Pretty JSON with token colors; keys, strings, numbers and literals differ. */
const JsonView: React.FC<{ value: unknown; query: string }> = ({ value, query }) => {
  const text = JSON.stringify(value, null, 2);
  const parts: React.ReactNode[] = [];
  const re = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    const cls = tok.endsWith(':') ? 'text-accent' : tok.startsWith('"') ? 'text-fg' : /true|false|null/.test(tok) ? 'text-warn' : 'text-info';
    parts.push(
      <span key={m.index} className={cls}>
        <Highlight text={tok} query={query} />
      </span>
    );
    last = m.index + tok.length;
  }
  parts.push(text.slice(last));
  return <pre className="whitespace-pre-wrap break-all text-fg-muted">{parts}</pre>;
};

interface LogRowProps {
  entry: LogEntry;
  query: string;
  wrap: boolean;
  expanded: boolean;
  selected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: (shiftKey: boolean) => void;
  onCopy: (text: string, what: string) => void;
}

export const LogRow: React.FC<LogRowProps> = ({ entry: e, query, wrap, expanded, selected, onToggleExpand, onToggleSelect, onCopy }) => {
  const style = LEVEL_STYLE[e.level];
  const firstLine = e.message.split('\n')[0];
  const multiline = e.message.includes('\n');
  return (
    <div className={clsx('group border-b border-line/40 font-mono text-xs', style.row, selected && 'bg-accent/10')}>
      <div className="flex items-start gap-2 px-2 py-[3px] hover:bg-raised/40">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => undefined}
          onClick={(ev) => onToggleSelect(ev.shiftKey)}
          aria-label="Select log entry"
          className="mt-[3px] h-3 w-3 flex-shrink-0 cursor-pointer accent-[rgb(var(--accent))]"
        />
        <button type="button" onClick={onToggleExpand} aria-expanded={expanded} aria-label={expanded ? 'Collapse entry' : 'Expand entry'} className="mt-px flex-shrink-0 cursor-pointer text-fg-subtle hover:text-accent">
          <ChevronRight className={clsx('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} aria-hidden />
        </button>
        <time dateTime={e.ts} title={e.ts} className="w-[6.6rem] flex-shrink-0 tabular-nums text-fg-subtle">{formatLogTime(e.ts)}</time>
        <span className={clsx('w-[4.4rem] flex-shrink-0 rounded px-1 text-center text-[10px] font-semibold uppercase leading-[18px]', style.badge)}>{e.level === 'WARN' ? 'warning' : e.level.toLowerCase()}</span>
        <span className="w-24 flex-shrink-0 truncate text-fg-subtle" title={e.source}>{e.source}</span>
        <span className={clsx('min-w-0 flex-1 cursor-text', wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre', e.level === 'DEBUG' ? 'text-fg-muted' : 'text-fg')} onDoubleClick={onToggleExpand}>
          <Highlight text={wrap ? e.message : firstLine} query={query} />
          {!wrap && multiline && <span className="ml-2 text-fg-subtle">…</span>}
          {e.fields && !expanded && <span className="ml-2 text-fg-subtle">{'{…}'}</span>}
        </span>
        <button type="button" onClick={() => onCopy(e.message, 'Message')} aria-label="Copy message" title="Copy message" className="flex-shrink-0 cursor-pointer text-fg-subtle opacity-0 hover:text-accent focus:opacity-100 group-hover:opacity-100">
          <Copy className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-line/40 bg-canvas/60 px-10 py-3 font-mono text-xs">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-fg-muted">
            <div><dt className="inline text-fg-subtle">time </dt><dd className="inline text-fg">{e.ts}</dd></div>
            {e.seq !== undefined && <div><dt className="inline text-fg-subtle">seq </dt><dd className="inline text-fg">{e.seq}</dd></div>}
            {e.runId && <div><dt className="inline text-fg-subtle">run </dt><dd className="inline"><Link className="text-accent hover:underline" to={`/runs/${e.runId}`}>{shortId(e.runId)}</Link></dd></div>}
            {e.taskId && <div><dt className="inline text-fg-subtle">task </dt><dd className="inline">{e.runId ? <Link className="text-accent hover:underline" to={`/runs/${e.runId}#task-${e.taskId}`}>{shortId(e.taskId)}</Link> : shortId(e.taskId)}</dd></div>}
            {e.jobId && <div><dt className="inline text-fg-subtle">job </dt><dd className="inline"><Link className="text-accent hover:underline" to={`/jobs?q=${encodeURIComponent(e.jobId)}`}>{shortId(e.jobId)}</Link></dd></div>}
            {e.workerId && <div><dt className="inline text-fg-subtle">worker </dt><dd className="inline"><Link className="text-accent hover:underline" to={`/workers?q=${encodeURIComponent(e.workerId)}`}>{e.workerId}</Link></dd></div>}
          </dl>
          {(multiline || looksLikeStackTrace(e.message)) && (
            <pre className={clsx('max-h-80 overflow-auto rounded border border-line/60 bg-canvas p-2 leading-relaxed', looksLikeStackTrace(e.message) ? 'text-danger' : 'text-fg')}>
              <Highlight text={e.message} query={query} />
            </pre>
          )}
          {e.fields && (
            <div className="rounded border border-line/60 bg-canvas p-2">
              <JsonView value={e.fields} query={query} />
            </div>
          )}
          <div className="flex flex-wrap gap-2 font-sans">
            <button type="button" className="cursor-pointer rounded border border-line px-2 py-1 text-xs text-fg-muted hover:border-accent/60 hover:text-accent" onClick={() => onCopy(e.message, 'Message')}>Copy message</button>
            <button type="button" className="cursor-pointer rounded border border-line px-2 py-1 text-xs text-fg-muted hover:border-accent/60 hover:text-accent" onClick={() => onCopy(JSON.stringify({ ...e, key: undefined }, null, 2), 'Entry')}>Copy entry as JSON</button>
          </div>
        </div>
      )}
    </div>
  );
};
