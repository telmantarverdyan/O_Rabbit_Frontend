import React from 'react';
import rabbitLogoUrl from '@/assets/rabbit/orabbit-logo.png';

interface RabbitLogoProps {
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const imageSizeClasses = {
  xl: 'h-20 w-20 md:h-24 md:w-24',
  lg: 'h-14 w-14',
  md: 'h-10 w-10',
  sm: 'h-8 w-8',
} as const;

export const RabbitLogo: React.FC<RabbitLogoProps> = ({
  className = '',
  compact = false,
  size = 'md',
}) => {
  return (
    <div className={`flex items-center gap-3 font-mono ${className}`}>
      <img
        alt="O_Rabbit Control Plane Logo"
        src={rabbitLogoUrl}
        className={`shrink-0 rounded-2xl bg-black/40 object-contain drop-shadow-[0_0_16px_rgba(0,255,102,0.45)] border border-emerald-500/30 ${imageSizeClasses[size]}`}
      />
      {!compact && (
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.32em] text-emerald-600 font-bold">
            OPERATOR CONSOLE
          </div>
          <div className="text-base font-extrabold uppercase tracking-[0.2em] text-emerald-100 glow-emerald flex items-center gap-1.5">
            <span>O_RABBIT</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff66] animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};
