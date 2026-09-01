import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  prefixSymbol?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  className,
  id,
  prefixSymbol,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1.5 font-mono">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefixSymbol && (
          <span className="absolute left-3 text-emerald-500/70 text-xs font-mono select-none">
            {prefixSymbol}
          </span>
        )}
        <input
          id={inputId}
          className={clsx(
            'w-full rounded-lg border border-surface-border bg-terminal-dark/90 px-3.5 py-2 text-xs font-mono text-emerald-100 placeholder-emerald-800/60 shadow-inner transition-all duration-150 focus:border-emerald-400 focus:bg-terminal-card focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-40',
            prefixSymbol && 'pl-8',
            error && 'border-rose-500 focus:border-rose-400 focus:ring-rose-400',
            className
          )}
          {...props}
        />
      </div>
      {helperText && !error && (
        <p className="text-[11px] text-emerald-500/60 font-mono">{helperText}</p>
      )}
      {error && <p className="text-[11px] text-rose-400 font-mono">! {error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: Array<{ label: string; value: string | number }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  helperText,
  error,
  options,
  className,
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1.5 font-mono">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          'w-full rounded-lg border border-surface-border bg-terminal-dark/90 px-3 py-2 text-xs font-mono text-emerald-100 shadow-inner transition-all duration-150 focus:border-emerald-400 focus:bg-terminal-card focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-40',
          error && 'border-rose-500 focus:border-rose-400 focus:ring-rose-400',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#050c08] text-emerald-200">
            {opt.label}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <p className="text-[11px] text-emerald-500/60 font-mono">{helperText}</p>
      )}
      {error && <p className="text-[11px] text-rose-400 font-mono">! {error}</p>}
    </div>
  );
};

