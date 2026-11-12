import React from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Inbox } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { Button } from './Button';
import { FieldHint, fieldClass, labelClass } from './Input';
import { Progress } from './Progress';
import { Window } from './Window';

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
      <div className="space-y-2 px-2 py-6" aria-busy="true" aria-label="Loading">
        <p className="font-pixel text-sm">Loading…</p>
        <Progress label="Loading" />
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex items-start gap-3 p-4">
        <AlertTriangle className="mt-0.5 h-8 w-8 flex-shrink-0 fill-warn/20 text-danger" aria-hidden />
        <div className="min-w-0 space-y-3">
          <p className="break-words text-sm">{errorMessage(error)}</p>
          {onRetry && <Button size="sm" onClick={onRetry}>Retry</Button>}
        </div>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Inbox className="h-8 w-8 text-fg-subtle" aria-hidden />
        <p className="text-sm text-fg-muted">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }
  return <>{children}</>;
};

/** A content window: title bar, actions as a menu row, description in the status bar. */
export const Panel: React.FC<{ title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean }> = ({
  title,
  description,
  actions,
  children,
  className,
  flush,
}) => (
  <Window title={title} menu={actions} status={description} className={className}>
    {/* Window body: a sunken white area for tables (flush), plain gray for forms. */}
    <div className={clsx('min-w-0', flush ? 'bevel-in mx-[2px] bg-canvas [&>[aria-busy]]:p-4 [&>[role=alert]]:m-1' : 'p-3')}>{children}</div>
  </Window>
);

/** Page heading on the teal desktop, styled like a desktop caption. */
export const PageTitle: React.FC<{ title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }> = ({ title, subtitle, actions, eyebrow }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <div className="desktop-text mb-1 text-xs">{eyebrow}</div>}
      <h1 className="desktop-text font-pixel text-3xl font-bold uppercase tracking-wide">{title}</h1>
      {subtitle && <p className="desktop-text mt-1 max-w-3xl text-sm">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; helperText?: string }> = ({ label, helperText, className, id, ...props }) => {
  const reactId = React.useId();
  const areaId = id || reactId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={areaId} className={labelClass}>
          {label}
        </label>
      )}
      <textarea id={areaId} spellCheck={false} className={clsx(fieldClass, 'py-1.5 font-mono text-xs leading-relaxed', className)} {...props} />
      <FieldHint helperText={helperText} />
    </div>
  );
};

export const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; helperText?: string }> = ({ label, checked, onChange, helperText }) => (
  <label className="flex cursor-pointer items-start gap-2 text-sm text-fg">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-[13px] w-[13px] cursor-pointer accent-[rgb(var(--accent))]" />
    <span>
      {label}
      {helperText && <span className="mt-0.5 block text-xs text-fg-subtle">{helperText}</span>}
    </span>
  </label>
);

/** 2–4 mutually exclusive options as a row of toggle buttons (pressed = selected). */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ label: string; value: T; disabled?: boolean }>; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <span className={clsx(labelClass, 'block')}>{label}</span>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-[2px]">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={clsx(
              'h-[26px] cursor-pointer bg-card px-3 text-xs disabled:cursor-not-allowed disabled:text-fg-subtle',
              value === o.value ? 'bevel-in bg-raised font-bold' : 'bevel-out active:bevel-in'
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

// table-fixed + wrapping cells: tables always fit their window and never scroll sideways.
export const tableClass = 'w-full table-fixed text-left text-[13px]';
// Column headers look like Win9x list-view header buttons.
export const thClass = 'bevel-out truncate bg-card px-2 py-1 text-xs font-normal text-fg';
export const tdClass = 'break-words px-2 py-1.5 align-middle';
export const rowClass = 'odd:bg-canvas even:bg-[#f4f4f4] hover:!bg-[#dcdcf2]';
