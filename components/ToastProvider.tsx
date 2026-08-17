'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface Toast {
  id: string;
  message: string;
  icon?: string;
  undoFn?: () => void;
}

interface ToastCtx {
  showToast: (msg: string, icon?: string, undoFn?: () => void) => void;
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  const remove = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
    clearTimeout(timers.current[id]);
  }, []);

  const showToast = useCallback((message: string, icon = '✓', undoFn?: () => void) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-3), { id, message, icon, undoFn }]);
    timers.current[id] = setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span>{t.message}</span>
            {t.undoFn && (
              <button className="toast-undo" onClick={() => { t.undoFn!(); remove(t.id); }}>
                Undo
              </button>
            )}
            <button onClick={() => remove(t.id)} style={{ marginLeft: t.undoFn ? 0 : 'auto', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
