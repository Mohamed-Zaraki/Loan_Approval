import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Close, Info } from './Icons';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

export function useToast(): {
  toast: ToastState | null;
  show: (message: string, tone?: ToastTone) => void;
  dismiss: () => void;
} {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function show(message: string, tone: ToastTone = 'success') {
    setToast({ id: Date.now(), message, tone });
  }

  return { toast, show, dismiss: () => setToast(null) };
}

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }): ReactNode {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      <span className="toast-icon">
        {toast.tone === 'success' ? (
          <Check size={16} />
        ) : toast.tone === 'error' ? (
          <Close size={16} />
        ) : (
          <Info size={16} />
        )}
      </span>
      <span>{toast.message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss notification">
        <Close size={14} />
      </button>
    </div>
  );
}
