import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePagination } from './usePagination';

const make = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('usePagination', () => {
  it('defaults to 10 rows per page', () => {
    const { result } = renderHook(() => usePagination(make(23)));
    expect(result.current.pageSize).toBe(10);
    expect(result.current.items).toHaveLength(10);
  });

  it('goes back to page 1 when the page size changes', () => {
    const { result } = renderHook(() => usePagination(make(237)));
    act(() => result.current.setPage(5));
    expect(result.current.page).toBe(5);
    act(() => result.current.setPageSize(25));
    expect(result.current).toMatchObject({ page: 1, pageSize: 25, from: 1, to: 25 });
  });

  it('moves to the last remaining page when the list shrinks', () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items), { initialProps: { items: make(23) } });
    act(() => result.current.setPage(3));
    rerender({ items: make(20) });
    expect(result.current).toMatchObject({ page: 2, from: 11, to: 20 });
  });
});
