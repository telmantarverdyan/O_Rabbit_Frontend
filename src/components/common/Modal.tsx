import React, { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Window } from './Window';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

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
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Win9x dialogs had no blur; a light dither keeps the desktop visible behind. */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <Window
        title={title}
        titleId="modal-title"
        onClose={onClose}
        status={subtitle}
        className={`relative z-10 max-h-[90vh] w-full ${maxWidthClasses[maxWidth]} shadow-[4px_4px_0_rgba(0,0,0,0.5)]`}
        bodyClassName="space-y-4 overflow-y-auto p-4"
      >
        {children}
      </Window>
    </div>
  );
};
