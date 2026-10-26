import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { BarChart3, Table2 } from 'lucide-react';
import { RUN_STATUS_ORDER, STATUS_STYLE, TimeBucket } from '@/utils/runStats';

/** Legend entries: a colored mark plus a text label and value, so identity is never color alone. */
export const StatusLegend: React.FC<{ counts: Record<string, number>; order?: readonly string[]; hideZero?: boolean }> = ({ counts, order = RUN_STATUS_ORDER, hideZero }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
    {order
      .filter((s) => !hideZero || (counts[s] ?? 0) > 0)
      .map((s) => (
        <li key={s} className="flex items-center gap-1.5 text-fg-muted">
          <span className={clsx('h-2 w-2 rounded-sm', STATUS_STYLE[s]?.dot ?? 'bg-fg-subtle')} aria-hidden />
          {STATUS_STYLE[s]?.label ?? s}
          <span className="tabular-nums text-fg">{(counts[s] ?? 0).toLocaleString()}</span>
        </li>
      ))}
  </ul>
);

/** Part-to-whole of run statuses as one horizontal bar with 2px gaps between segments. */
export const StatusStackBar: React.FC<{ counts: Record<string, number>; order?: readonly string[] }> = ({ counts, order = RUN_STATUS_ORDER }) => {
  const total = order.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm bg-raised" role="img" aria-label={order.map((s) => `${STATUS_STYLE[s]?.label ?? s} ${counts[s] ?? 0}`).join(', ')}>
        {total > 0 &&
          order
            .filter((s) => (counts[s] ?? 0) > 0)
            .map((s) => (
              <div
                key={s}
                className={clsx('h-full first:rounded-l-sm last:rounded-r-sm', STATUS_STYLE[s]?.bar ?? 'bg-fg-subtle')}
                style={{ width: `${((counts[s] ?? 0) / total) * 100}%` }}
                title={`${STATUS_STYLE[s]?.label ?? s}: ${counts[s]} (${Math.round(((counts[s] ?? 0) / total) * 100)}%)`}
              />
            ))}
      </div>
      <StatusLegend counts={counts} order={order} hideZero />
    </div>
  );
};

/** Stacked columns of runs per time bucket, with a hover tooltip and a table view. */
export const RunsTimeline: React.FC<{ buckets: TimeBucket[]; caption: string }> = ({ buckets, caption }) => {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const labelEvery = Math.ceil(buckets.length / 6);
  const active = hover !== null ? buckets[hover] : null;
  const totals: Record<string, number> = {};
  for (const b of buckets) for (const [s, n] of Object.entries(b.counts)) totals[s] = (totals[s] ?? 0) + n;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusLegend counts={totals} hideZero />
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs text-fg-muted hover:bg-raised hover:text-accent"
          aria-pressed={asTable}
        >
          {asTable ? <BarChart3 className="h-3.5 w-3.5" aria-hidden /> : <Table2 className="h-3.5 w-3.5" aria-hidden />}
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {asTable ? (
        <table className="w-full table-fixed text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-fg-muted">
              <th className="py-1.5 font-medium">Time</th>
              <th className="py-1.5 text-right font-medium">Total</th>
              {RUN_STATUS_ORDER.filter((s) => totals[s]).map((s) => (
                <th key={s} className="hidden py-1.5 text-right font-medium sm:table-cell">{STATUS_STYLE[s].label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.filter((b) => b.total).map((b) => (
              <tr key={b.start.toISOString()} className="border-t border-line/60">
                <td className="py-1.5 text-fg-muted">{b.label}</td>
                <td className="py-1.5 text-right tabular-nums text-fg">{b.total}</td>
                {RUN_STATUS_ORDER.filter((s) => totals[s]).map((s) => (
                  <td key={s} className="hidden py-1.5 text-right tabular-nums text-fg sm:table-cell">{b.counts[s] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          {/* Tooltip for the hovered column. */}
          <div className={clsx('pointer-events-none absolute right-0 top-0 z-10 min-w-[9rem] rounded border border-line bg-canvas/95 px-3 py-2 text-xs shadow-lg transition-opacity', active ? 'opacity-100' : 'opacity-0')} aria-hidden>
            {active && (
              <>
                <p className="mb-1 text-fg">{active.label} · {active.total} runs</p>
                {RUN_STATUS_ORDER.filter((s) => active.counts[s]).map((s) => (
                  <p key={s} className="flex items-center gap-1.5 text-fg-muted">
                    <span className={clsx('h-2 w-2 rounded-sm', STATUS_STYLE[s].dot)} />
                    {STATUS_STYLE[s].label}
                    <span className="ml-auto pl-3 tabular-nums text-fg">{active.counts[s]}</span>
                  </p>
                ))}
              </>
            )}
          </div>

          <div className="flex h-40 items-stretch gap-[2px] border-b border-line pt-6" role="img" aria-label={`${caption}. Use the Table button for exact values.`}>
            <span className="absolute left-0 top-0 text-[10px] tabular-nums text-fg-subtle">{max}</span>
            {buckets.map((b, i) => (
              <div
                key={b.start.toISOString()}
                className={clsx('flex flex-1 cursor-default flex-col-reverse gap-[2px] rounded-t-sm', hover === i && 'bg-raised/60')}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {RUN_STATUS_ORDER.filter((s) => b.counts[s]).map((s, idx, arr) => (
                  <div
                    key={s}
                    className={clsx(STATUS_STYLE[s].bar, idx === arr.length - 1 && 'rounded-t-sm')}
                    style={{ height: `${((b.counts[s] ?? 0) / max) * 100}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[2px] text-[10px] text-fg-subtle">
            {buckets.map((b, i) => (
              <span key={b.start.toISOString()} className="flex-1 truncate text-center">
                {i % labelEvery === 0 ? b.label : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Ranked horizontal bars with the value written next to each bar. */
export const BarList: React.FC<{ items: Array<{ key: string; label: React.ReactNode; value: number; to?: string; tone?: string }>; empty: string }> = ({ items, empty }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-sm text-fg-subtle">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const label = item.to ? <Link to={item.to} className="truncate hover:text-accent hover:underline">{item.label}</Link> : <span className="truncate">{item.label}</span>;
        return (
          <li key={item.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-fg">{label}</span>
              <span className="tabular-nums text-fg-muted">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-raised">
              <div className={clsx('h-full rounded-full', item.tone ?? 'bg-accent')} style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
