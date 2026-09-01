import React, { useEffect } from 'react';
import { X, Terminal } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} overflow-hidden rounded-xl border border-emerald-500/40 bg-[#050c08] shadow-terminal-glow transition-all z-10 flex flex-col max-h-[90vh] font-mono`}
      >
        {/* Terminal Window Header Bar */}
        <div className="flex items-center justify-between border-b border-surface-border bg-[#030805] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 cursor-pointer" onClick={onClose} />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-200 tracking-wide flex items-center gap-1.5">
                <span className="text-emerald-400">$</span>
                {title}
              </h3>
              {subtitle && <p className="text-[11px] text-emerald-500/60 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-emerald-500/60 hover:bg-emerald-950/60 hover:text-emerald-300 transition text-xs flex items-center gap-1"
            title="Press Esc to close"
          >
            <span className="text-[10px] hidden sm:inline">[ESC]</span>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
};

