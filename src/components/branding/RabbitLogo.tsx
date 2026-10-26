import React from 'react';
import rabbitLogoUrl from '@/assets/rabbit/orabbit-logo.png';

interface RabbitLogoProps {
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const imageSizeClasses = {
  xl: 'h-16 w-16',
  lg: 'h-12 w-12',
  md: 'h-9 w-9',
  sm: 'h-7 w-7',
} as const;

export const RabbitLogo: React.FC<RabbitLogoProps> = ({ className = '', compact = false, size = 'md' }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <img alt="O_Rabbit" src={rabbitLogoUrl} className={`shrink-0 rounded-lg object-contain drop-shadow-[0_0_12px_rgb(0_255_102/0.45)] ${imageSizeClasses[size]}`} />
    {!compact && (
      <div className="min-w-0 leading-tight">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-fg glow">O_Rabbit</div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-fg-subtle">Operator console</div>
      </div>
    )}
  </div>
);
