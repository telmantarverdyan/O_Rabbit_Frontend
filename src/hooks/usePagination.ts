import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE, PageSize, PageSlice, paginate } from '@/utils/pagination';

export interface Pagination<T> extends PageSlice<T> {
  pageSize: PageSize;
  setPage: (page: number) => void;
  /** Changing the page size always returns to the first page. */
  setPageSize: (size: PageSize) => void;
}

/**
 * Client-side pagination for a list that is already loaded (and cached by React Query).
 * Pass the list *after* any filtering, so filters and paging always agree.
 * If the list shrinks (a delete, a narrower filter), the page clamps instead of going blank.
 */
export function usePagination<T>(items: readonly T[], initialPageSize: PageSize = DEFAULT_PAGE_SIZE): Pagination<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);

  const slice = useMemo(() => paginate(items, page, pageSize), [items, page, pageSize]);

  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  return { ...slice, pageSize, setPage, setPageSize };
}
