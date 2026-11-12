import React from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS, PageSize, pageNumbers } from '@/utils/pagination';
import type { Pagination as PaginationState } from '@/hooks/usePagination';

interface PaginationProps {
  state: PaginationState<unknown>;
  /** Plural noun for the total, e.g. "jobs". */
  noun: string;
}

const navButton =
  'bevel-out inline-flex h-[24px] min-w-[24px] cursor-pointer items-center justify-center gap-1 bg-card px-1.5 text-xs active:bevel-in disabled:cursor-not-allowed disabled:text-fg-subtle';

/** Table footer: total count, rows-per-page select, and Previous / page numbers / Next. */
export const Pagination: React.FC<PaginationProps> = ({ state, noun }) => {
  const { page, totalPages, total, from, to, pageSize, setPage, setPageSize } = state;
  const selectId = React.useId();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-card px-2 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-fg-muted">
        <span aria-live="polite">
          {total === 0 ? `0 ${noun}` : <>Showing <span className="tabular-nums text-fg">{from}–{to}</span> of <span className="tabular-nums text-fg">{total.toLocaleString()}</span> {noun}</>}
        </span>
        <label htmlFor={selectId} className="flex items-center gap-2">
          Rows per page
          <select
            id={selectId}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
            className="bevel-in h-[24px] cursor-pointer bg-canvas px-1 text-xs text-fg focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size} className="bg-card">{size}</option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <nav aria-label={`${noun} pages`} className="flex flex-wrap items-center gap-1">
          <button type="button" className={navButton} onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Previous</span>
          </button>
          {pageNumbers(page, totalPages).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-fg-subtle" aria-hidden>…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={clsx(navButton, 'tabular-nums', p === page && '!bevel-in bg-raised font-bold')}
              >
                {p}
              </button>
            )
          )}
          <button type="button" className={navButton} onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
};
