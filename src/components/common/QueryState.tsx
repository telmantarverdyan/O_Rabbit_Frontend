import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { Button } from './Button';

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

/** Renders the loading, error and empty states every data-fetching view needs. */
export const QueryState: React.FC<QueryStateProps> = ({ isLoading, error, isEmpty, emptyMessage = 'Nothing here yet.', onRetry, children }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-xs text-emerald-500/70">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        Loading...
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-6 text-center text-xs text-rose-300">
        <AlertTriangle className="h-5 w-5" />
        <p className="break-words max-w-2xl">{errorMessage(error)}</p>
        {onRetry && <Button variant="danger" size="sm" onClick={onRetry}>Retry</Button>}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-xs text-emerald-600">
        <Inbox className="h-5 w-5" />
        {emptyMessage}
      </div>
    );
  }
  return <>{children}</>;
};

export const Panel: React.FC<{ title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, actions, children, className = '' }) => (
  <section className={`rounded-xl border border-surface-border bg-surface/90 shadow-terminal-sm ${className}`}>
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{title}</h2>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

export const PageTitle: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold text-emerald-100">{title}</h1>
      {subtitle && <p className="text-xs text-emerald-500/70 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; helperText?: string }> = ({ label, helperText, className = '', id, ...props }) => {
  const areaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="space-y-1.5 font-mono">
      {label && (
        <label htmlFor={areaId} className="block text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        spellCheck={false}
        className={`w-full rounded-lg border border-surface-border bg-terminal-dark/90 px-3.5 py-2 text-xs font-mono text-emerald-100 placeholder-emerald-800/60 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 ${className}`}
        {...props}
      />
      {helperText && <p className="text-[11px] text-emerald-500/60">{helperText}</p>}
    </div>
  );
};

export const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; helperText?: string }> = ({ label, checked, onChange, helperText }) => (
  <label className="flex items-start gap-2 text-xs text-emerald-200 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-emerald-500" />
    <span>
      {label}
      {helperText && <span className="block text-[11px] text-emerald-500/60">{helperText}</span>}
    </span>
  </label>
);

export const tableClass = 'w-full text-left text-xs';
export const thClass = 'px-3 py-2 font-semibold uppercase tracking-wider text-[10px] text-emerald-500/80 border-b border-surface-border';
export const tdClass = 'px-3 py-2 border-b border-surface-border/50 align-top';
