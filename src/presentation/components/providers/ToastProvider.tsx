'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
};

type ToastContextValue = {
  showToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id' | 'createdAt'>) => {
    const id = Math.random();
    setToasts((prev) => {
      const next: Toast[] = [
        ...prev,
        {
          id,
          createdAt: Date.now(),
          ...toast,
        },
      ];
      return next.slice(-5);
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const handleClose = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const contextValue = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ top: `${index * 72 + 24}px !important` }}
        >
          <Alert
            severity={toast.variant === 'info' ? 'info' : toast.variant}
            variant="filled"
            onClose={() => handleClose(toast.id)}
            sx={{ width: '100%', minWidth: 300 }}
          >
            <AlertTitle>{toast.title}</AlertTitle>
            {toast.description}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
