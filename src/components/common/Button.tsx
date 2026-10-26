import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `cyber` and `outline` are kept as aliases of `primary` and `secondary`. */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'cyber';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
}

const variantStyles = {
  // Inverse video, like a selected item on a green-screen terminal.
  primary: 'bg-accent text-accent-fg hover:bg-accent-strong font-semibold uppercase tracking-wide glow-box',
  secondary: 'bg-canvas text-accent border border-line hover:border-accent/70 hover:bg-raised',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
  ghost: 'text-fg-muted hover:text-accent hover:bg-raised',
} as const;

const sizeStyles = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
} as const;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className,
  disabled,
  type = 'button',
  ...props
}) => {
  const resolved = variant === 'cyber' ? 'primary' : variant === 'outline' ? 'secondary' : variant;
  // toArray drops null/undefined/booleans; an empty string marks an icon-only button.
  const hasText = React.Children.toArray(children).some((c) => c !== '');
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[resolved],
        sizeStyles[size],
        !hasText && (size === 'sm' ? 'w-8 px-0' : 'w-9 px-0'),
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
      )}
      {hasText && <span>{children}</span>}
    </button>
  );
};
