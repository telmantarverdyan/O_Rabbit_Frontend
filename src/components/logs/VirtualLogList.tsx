import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface VirtualLogListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderRow: (item: T, index: number) => React.ReactNode;
  /** Keep the view pinned to the newest (last) row. */
  follow: boolean;
  /** Called when the user scrolls, with whether they are at the bottom. */
  onScrollPosition?: (atBottom: boolean) => void;
  /** Called when the user reaches the top (to load older entries). */
  onReachTop?: () => void;
  wrap: boolean;
  className?: string;
  estimatedRowHeight?: number;
  overscan?: number;
}

const BOTTOM_SLACK = 24;

/**
 * Variable-height virtual list: only rows in (or near) the viewport are in the
 * DOM, with spacers standing in for the rest. Heights are measured with a
 * ResizeObserver (rows grow when expanded or wrapped). Rows stay in normal
 * flow so a no-wrap list can scroll horizontally.
 */
export function VirtualLogList<T>({
  items,
  getKey,
  renderRow,
  follow,
  onScrollPosition,
  onReachTop,
  wrap,
  className,
  estimatedRowHeight = 24,
  overscan = 12,
}: VirtualLogListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const heights = useRef(new Map<string, number>());
  const [version, setVersion] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(600);
  const frame = useRef(0);

  // Wrapping changes every row height: forget the measurements.
  useEffect(() => {
    heights.current.clear();
    setVersion((v) => v + 1);
  }, [wrap]);

  const offsets = useMemo(() => {
    const out = new Float64Array(items.length + 1);
    for (let i = 0; i < items.length; i++) out[i + 1] = out[i] + (heights.current.get(getKey(items[i])) ?? estimatedRowHeight);
    return out;
    // version: re-run when measurements change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, version, estimatedRowHeight]);
  const total = offsets[items.length];

  // First row whose bottom is below the top of the viewport.
  const findIndex = (y: number) => {
    let lo = 0;
    let hi = items.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid + 1] <= y) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const start = Math.max(0, findIndex(scrollTop) - overscan);
  let end = findIndex(scrollTop + viewport) + overscan;
  end = Math.min(items.length, end + 1);

  // Measure rendered rows; batch updates into one re-render per frame.
  const observer = useMemo(
    () =>
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            let changed = false;
            for (const entry of entries) {
              const key = (entry.target as HTMLElement).dataset.key;
              const h = Math.ceil((entry.target as HTMLElement).getBoundingClientRect().height);
              if (key && h && heights.current.get(key) !== h) {
                heights.current.set(key, h);
                changed = true;
              }
            }
            if (changed) {
              cancelAnimationFrame(frame.current);
              frame.current = requestAnimationFrame(() => setVersion((v) => v + 1));
            }
          }),
    []
  );
  useEffect(() => () => observer?.disconnect(), [observer]);
  const measure = useCallback((el: HTMLDivElement | null) => el && observer?.observe(el), [observer]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewport(el.clientHeight));
    ro.observe(el);
    setViewport(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // Scroll anchoring: remember which row is at the top of the view (and how far
  // into it), and put it back after any change above it, whether older rows were
  // prepended or the oldest rows were dropped to respect the entry cap.
  const anchor = useRef<{ key: string; delta: number } | null>(null);
  const indexByKey = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it, i) => m.set(getKey(it), i));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || follow) return;
    const a = anchor.current;
    const idx = a ? indexByKey.get(a.key) : undefined;
    if (a && idx !== undefined) {
      const target = offsets[idx] + a.delta;
      if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
    }
  });
  const rememberAnchor = (top: number) => {
    const i = findIndex(top);
    if (i < items.length) anchor.current = { key: getKey(items[i]), delta: top - offsets[i] };
  };

  // Follow the newest rows.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (follow && el) el.scrollTop = el.scrollHeight;
  }, [follow, total, items.length]);

  const lastTop = useRef(0);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SLACK;
    // Only a scroll *up* by the user stops following. Rows measured after a
    // programmatic jump to the bottom can briefly leave us "not at bottom";
    // that must not switch following off.
    if (atBottom) onScrollPosition?.(true);
    else if (el.scrollTop < lastTop.current - 2) onScrollPosition?.(false);
    lastTop.current = el.scrollTop;
    rememberAnchor(el.scrollTop);
    if (el.scrollTop < 40) onReachTop?.();
  };

  return (
    <div ref={scrollRef} onScroll={onScroll} className={clsx('relative overflow-y-auto', wrap ? 'overflow-x-hidden' : 'overflow-x-auto', className)} role="log" aria-live="off">
      <div className={wrap ? '' : 'w-max min-w-full'}>
        <div style={{ height: offsets[start] }} aria-hidden />
        {items.slice(start, end).map((item, i) => (
          <div key={getKey(item)} data-key={getKey(item)} ref={measure}>
            {renderRow(item, start + i)}
          </div>
        ))}
        <div style={{ height: total - offsets[end] }} aria-hidden />
      </div>
    </div>
  );
}
