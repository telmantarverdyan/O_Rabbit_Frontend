import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'cyber';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-400 shadow-terminal-sm hover:shadow-terminal-glow font-mono font-semibold',
    cyber:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-mono font-bold border border-emerald-400 shadow-terminal-glow',
    secondary:
      'bg-surface-subtle hover:bg-surface-border text-emerald-300 hover:text-emerald-100 border border-surface-border hover:border-emerald-500/40 shadow-sm font-mono',
    danger:
      'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-200 border border-rose-600/40 hover:border-rose-500 shadow-terminal-crimson font-mono',
    ghost:
      'bg-transparent hover:bg-surface-subtle/80 text-emerald-400/80 hover:text-emerald-200 border border-transparent font-mono',
    outline:
      'bg-transparent border border-surface-border hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 font-mono',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-xs sm:text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm sm:text-base gap-2.5',
  };

  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 focus:outline-none focus:ring-1 focus:ring-emerald-400/50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Icon && <Icon className="h-3.5 w-3.5" />
      )}
      <span>{children}</span>
    </button>
  );
};

