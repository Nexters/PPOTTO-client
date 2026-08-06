'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

const DURATION_MS = 2000;
const EXIT_MS = 400;

type ToastState = { id: number; message: string };

const ToastContext = createContext<((message: string) => void) | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast는 ToastProvider 안에서만 쓸 수 있어요.');
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ id: nextId.current, message });
    timer.current = setTimeout(() => setToast(null), DURATION_MS + EXIT_MS);
  }, []);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          className={cn(
            // 모달(z-50)이 열린 상태에서 띄워도 가려지지 않게 한 단계 위에 둔다.
            'pointer-events-none fixed inset-x-0 bottom-12 z-60',
            'flex justify-center px-6',
          )}
          role="status"
          aria-live="polite"
        >
          <p
            key={toast.id}
            className={cn(
              'text-body-06 animate-toast-up max-w-67.5 rounded-[30px]',
              'bg-gray-800 px-6 py-2 text-center text-white',
            )}
          >
            {toast.message}
          </p>
        </div>
      )}
    </ToastContext.Provider>
  );
}
