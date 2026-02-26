import { useState, useCallback } from 'react';
import { ToastMessage } from '@/components/Toast';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: 'success' | 'error' | 'info',
    message: string,
    duration?: number,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toast: ToastMessage = { id, type, message, duration, action };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    return addToast('success', message, duration, action);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    return addToast('error', message, duration, action);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    return addToast('info', message, duration, action);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
  };
}
