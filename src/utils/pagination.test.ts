import { describe, it, expect } from 'vitest';
import { paginate, pageNumbers } from './pagination';

const list = Array.from({ length: 23 }, (_, i) => i + 1);

describe('paginate', () => {
  it('returns the first page', () => {
    const p = paginate(list, 1, 10);
    expect(p).toMatchObject({ page: 1, totalPages: 3, total: 23, from: 1, to: 10 });
    expect(p.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('returns a short last page', () => {
    const p = paginate(list, 3, 10);
    expect(p).toMatchObject({ page: 3, from: 21, to: 23 });
    expect(p.items).toEqual([21, 22, 23]);
  });

  it('handles a list that fills its last page exactly', () => {
    expect(paginate(list.slice(0, 20), 2, 10)).toMatchObject({ page: 2, totalPages: 2, from: 11, to: 20 });
  });

  it('handles an empty list as one empty page', () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, totalPages: 1, total: 0, from: 0, to: 0 });
  });

  it('clamps pages outside the valid range', () => {
    expect(paginate(list, 9, 10).page).toBe(3);
    expect(paginate(list, 0, 10).page).toBe(1);
    expect(paginate(list, -4, 10).page).toBe(1);
  });
});

describe('pageNumbers', () => {
  it('lists every page when there are few', () => {
    expect(pageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps first, last and neighbors, with gaps in between', () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, 'gap', 20]);
    expect(pageNumbers(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
    expect(pageNumbers(20, 20)).toEqual([1, 'gap', 19, 20]);
  });

  it('never shows a gap that hides only nothing', () => {
    expect(pageNumbers(3, 20)).toEqual([1, 2, 3, 4, 'gap', 20]);
  });
});
