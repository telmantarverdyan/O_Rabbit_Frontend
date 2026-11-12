import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { Window } from './Window';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, durationMs = 4000 }: Omit<ToastMessage, 'id'>) => {
      const id = String(Date.now() + Math.random());
      const newToast: ToastMessage = { id, type, title, message, durationMs };

      setToasts((prev) => [...prev, newToast]);

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast({ type: 'success', title, message }),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast({ type: 'error', title, message, durationMs: 6000 }),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast({ type: 'warning', title, message }),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast({ type: 'info', title, message }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Above the taskbar, like Win9x balloon/system dialogs. */}
      <div className="pointer-events-none fixed bottom-14 right-3 z-[60] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info }[toast.type];
          const tone = { success: 'text-[#008000]', error: 'text-danger', warning: 'text-warn', info: 'text-info' }[toast.type];
          return (
            <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'} className="pointer-events-auto animate-fade-in shadow-[3px_3px_0_rgba(0,0,0,0.45)]">
              <Window title={toast.title ?? { success: 'System', error: 'Error', warning: 'Warning', info: 'System' }[toast.type]} onClose={() => removeToast(toast.id)} controls>
                <div className="flex items-start gap-3 p-3">
                  <Icon className={clsx('mt-0.5 h-6 w-6 flex-shrink-0', tone)} aria-hidden />
                  <p className="break-words text-[13px] text-fg">{toast.message}</p>
                </div>
              </Window>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

