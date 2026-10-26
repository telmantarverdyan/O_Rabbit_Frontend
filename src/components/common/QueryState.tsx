import React from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Inbox } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { Button } from './Button';
import { FieldHint, fieldClass, labelClass } from './Input';

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}

/** Renders the loading, error and empty states every data-fetching view needs. */
export const QueryState: React.FC<QueryStateProps> = ({ isLoading, error, isEmpty, emptyMessage = 'Nothing here yet.', emptyAction, onRetry, children }) => {
  if (isLoading) {
    return (
      <div className="space-y-2 py-2" aria-busy="true" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-raised/60" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-danger/30 bg-danger/5 px-6 py-8 text-center">
        <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
        <p className="max-w-2xl break-words text-sm text-fg">{errorMessage(error)}</p>
        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full bg-raised p-3">
          <Inbox className="h-5 w-5 text-fg-subtle" aria-hidden />
        </div>
        <p className="text-sm text-fg-muted">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }
  return <>{children}</>;
};

export const Panel: React.FC<{ title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean }> = ({
  title,
  description,
  actions,
  children,
  className,
  flush,
}) => (
  <section className={clsx('rounded-md border border-line bg-card/90 shadow-[inset_0_1px_0_rgb(var(--accent)/0.06)]', className)}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-accent glow">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
    {/* Flush panels hold edge-to-edge tables; loading and error states still get padding. */}
    <div className={flush ? '[&>[aria-busy]]:p-5 [&>[role=alert]]:m-5' : 'p-5'}>{children}</div>
  </section>
);

export const PageTitle: React.FC<{ title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }> = ({ title, subtitle, actions, eyebrow }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <div className="mb-1 text-xs font-medium text-fg-subtle">{eyebrow}</div>}
      <h1 className="cursor-block text-2xl font-bold tracking-tight text-fg glow">
        <span className="mr-2 text-accent" aria-hidden>&gt;</span>
        {title}
      </h1>
      {subtitle && <p className="mt-1 max-w-3xl text-sm text-fg-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; helperText?: string }> = ({ label, helperText, className, id, ...props }) => {
  const reactId = React.useId();
  const areaId = id || reactId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={areaId} className={labelClass}>
          {label}
        </label>
      )}
      <textarea id={areaId} spellCheck={false} className={clsx(fieldClass, 'py-2 font-mono text-xs leading-relaxed', className)} {...props} />
      <FieldHint helperText={helperText} />
    </div>
  );
};

export const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; helperText?: string }> = ({ label, checked, onChange, helperText }) => (
  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-fg">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line accent-[rgb(var(--accent))]"
    />
    <span>
      {label}
      {helperText && <span className="mt-0.5 block text-xs text-fg-subtle">{helperText}</span>}
    </span>
  </label>
);

/** A segmented control for 2–4 mutually exclusive options. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ label: string; value: T; disabled?: boolean }>; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <span className={labelClass}>{label}</span>}
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-canvas p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={clsx(
              'h-8 cursor-pointer rounded px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              value === o.value ? 'bg-raised font-medium text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Small monospace identifier, truncated, with the full value on hover. */
export const Mono: React.FC<{ children: React.ReactNode; title?: string; className?: string }> = ({ children, title, className }) => (
  <span className={clsx('font-mono text-xs', className)} title={title}>
    {children}
  </span>
);

export const tableClass = 'w-full text-left text-sm';
export const thClass = 'whitespace-nowrap bg-raised/40 px-4 py-2.5 text-xs font-medium text-fg-muted first:pl-5 last:pr-5';
export const tdClass = 'border-t border-line/70 px-4 py-3 align-middle first:pl-5 last:pr-5';
export const rowClass = 'transition-colors hover:bg-raised/40';
