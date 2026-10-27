import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';

/** `?q=` filter used when another page (such as Logs) links to one item in a list. */
export function useUrlQueryFilter(): [string, () => void] {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const clear = () => {
    const next = new URLSearchParams(params);
    next.delete('q');
    setParams(next, { replace: true });
  };
  return [q, clear];
}

export const UrlFilterChip: React.FC<{ q: string; onClear: () => void }> = ({ q, onClear }) =>
  q ? (
    <div className="flex items-center gap-2 border-b border-line px-5 py-2.5 text-xs text-fg-muted">
      Showing only matches for <code className="rounded bg-raised px-1.5 py-0.5 text-fg">{q}</code>
      <button type="button" onClick={onClear} className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-accent hover:bg-raised" aria-label="Clear filter">
        <X className="h-3 w-3" aria-hidden /> Clear
      </button>
    </div>
  ) : null;
