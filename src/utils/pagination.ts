export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;

export interface PageSlice<T> {
  /** Only the rows of the current page; the table renders nothing else. */
  items: T[];
  /** 1-based current page, clamped to the valid range. */
  page: number;
  /** Always at least 1, so an empty list still shows "page 1 of 1". */
  totalPages: number;
  total: number;
  /** 1-based index of the first row shown, 0 when the list is empty. */
  from: number;
  /** 1-based index of the last row shown, 0 when the list is empty. */
  to: number;
}

/** Cuts one page out of a list. Out-of-range pages snap to the nearest valid page. */
export function paginate<T>(all: readonly T[], page: number, pageSize: number): PageSlice<T> {
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  const items = all.slice(start, start + pageSize);
  return { items, page: current, totalPages, total, from: total ? start + 1 : 0, to: start + items.length };
}

/**
 * Page numbers to show as buttons, with 'gap' where pages are skipped.
 * Always keeps the first and last page and `siblings` pages around the current one,
 * e.g. [1, 'gap', 4, 5, 6, 'gap', 20].
 */
export function pageNumbers(page: number, totalPages: number, siblings = 1): Array<number | 'gap'> {
  // Small enough to list every page without gaps.
  if (totalPages <= 5 + siblings * 2) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const left = Math.max(2, page - siblings);
  const right = Math.min(totalPages - 1, page + siblings);
  const out: Array<number | 'gap'> = [1];
  if (left > 2) out.push('gap');
  for (let p = left; p <= right; p++) out.push(p);
  if (right < totalPages - 1) out.push('gap');
  out.push(totalPages);
  return out;
}
