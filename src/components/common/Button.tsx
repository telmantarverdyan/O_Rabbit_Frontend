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

// Win9x push buttons: raised gray, sunken while pressed. The default (primary)
// button has the extra dark outline Windows draws around the Enter button.
const variantStyles = {
  primary: 'bevel-out font-bold outline outline-1 outline-fg active:bevel-in',
  secondary: 'bevel-out active:bevel-in',
  danger: 'bevel-out text-danger font-bold active:bevel-in',
  ghost: 'border-2 border-transparent hover:bevel-out active:bevel-in',
} as const;

const sizeStyles = {
  sm: 'h-[26px] px-2 text-xs gap-1.5',
  md: 'h-[30px] px-3 text-[13px] gap-1.5',
  lg: 'h-[36px] px-4 text-sm gap-2',
} as const;

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', icon: Icon, loading = false, className, disabled, type = 'button', ...props }) => {
  const resolved = variant === 'cyber' ? 'primary' : variant === 'outline' ? 'secondary' : variant;
  // toArray drops null/undefined/booleans; an empty string marks an icon-only button.
  const hasText = React.Children.toArray(children).some((c) => c !== '');
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap bg-card font-pixel text-fg active:translate-x-px active:translate-y-px disabled:cursor-not-allowed disabled:text-fg-subtle disabled:[text-shadow:1px_1px_0_#fff]',
        variantStyles[resolved],
        sizeStyles[size],
        !hasText && (size === 'sm' ? 'w-[26px] px-0' : 'w-[30px] px-0'),
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
