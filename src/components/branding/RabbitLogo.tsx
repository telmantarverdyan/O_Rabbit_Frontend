import React from 'react';
import rabbitLogoUrl from '@/assets/rabbit/orabbit-pixel.svg';

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
    <img alt="O_Rabbit" src={rabbitLogoUrl} className={`shrink-0 object-contain [image-rendering:pixelated] ${imageSizeClasses[size]}`} />
    {!compact && (
      <div className="min-w-0 leading-tight">
        <div className="font-pixel text-sm font-bold uppercase">O_Rabbit</div>
        <div className="text-[11px] text-fg-subtle">Operator console</div>
      </div>
    )}
  </div>
);
