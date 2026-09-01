import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Info, X, Terminal } from 'lucide-react';
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
      {/* Terminal Toast Render Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'border-emerald-500/50 bg-[#040d08]/95 text-emerald-300 shadow-terminal-glow',
            error: 'border-rose-500/50 bg-[#0d0406]/95 text-rose-300 shadow-terminal-crimson',
            warning: 'border-amber-500/50 bg-[#0d0a04]/95 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
            info: 'border-cyan-500/50 bg-[#040a0d]/95 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
          };

          const prefix = {
            success: '[✓ OK]',
            error: '[✖ ERR]',
            warning: '[▲ WARN]',
            info: '[i INFO]',
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={clsx(
                'pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md transition-all duration-300 font-mono text-xs',
                typeStyles[toast.type]
              )}
            >
              <span className="font-bold text-emerald-400 select-none text-[11px] mt-0.5">
                {prefix}
              </span>
              <div className="flex-1 space-y-0.5 min-w-0">
                {toast.title && (
                  <h5 className="font-bold text-xs text-white tracking-wide">
                    {toast.title}
                  </h5>
                )}
                <p className="text-[11px] opacity-90 leading-relaxed break-words font-mono">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-emerald-500/60 hover:text-emerald-300 transition p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
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

