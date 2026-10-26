import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

export const fieldClass =
  'w-full rounded-md border border-line bg-canvas px-3 text-sm text-fg placeholder:text-fg-subtle/70 transition-colors hover:border-fg-subtle/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-50';

export const labelClass = 'block text-xs font-medium text-fg-muted';

export const FieldHint: React.FC<{ helperText?: string; error?: string; id?: string }> = ({ helperText, error, id }) => {
  if (error) return <p id={id} className="text-xs text-danger">{error}</p>;
  if (helperText) return <p id={id} className="text-xs leading-relaxed text-fg-subtle">{helperText}</p>;
  return null;
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: LucideIcon;
  /** @deprecated use `icon`; kept for older callers. */
  prefixSymbol?: string;
}

export const Input: React.FC<InputProps> = ({ label, helperText, error, className, id, icon: Icon, prefixSymbol: _prefix, ...props }) => {
  const reactId = React.useId();
  const inputId = id || reactId;
  const hintId = `${inputId}-hint`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
          {props.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />}
        <input
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={helperText || error ? hintId : undefined}
          className={clsx(fieldClass, 'h-9', Icon && 'pl-9', error && 'border-danger focus:border-danger focus:ring-danger/25', className)}
          {...props}
        />
      </div>
      <FieldHint helperText={helperText} error={error} id={hintId} />
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: Array<{ label: string; value: string | number }>;
}

export const Select: React.FC<SelectProps> = ({ label, helperText, error, options, className, id, ...props }) => {
  const reactId = React.useId();
  const selectId = id || reactId;
  const hintId = `${selectId}-hint`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className={labelClass}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-describedby={helperText || error ? hintId : undefined}
        className={clsx(fieldClass, 'h-9 cursor-pointer pr-8', error && 'border-danger', className)}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-card text-fg">
            {opt.label}
          </option>
        ))}
      </select>
      <FieldHint helperText={helperText} error={error} id={hintId} />
    </div>
  );
};
