'use client';

import { useCallback } from 'react';

import { cn } from '@/shared/lib/cn';

type TextInputOverlayProps = {
  value: string;
  onChange: (value: string) => void;
  fontSize: number;
};

export function TextInputOverlay({ value, onChange, fontSize }: TextInputOverlayProps) {
  const focusOnMount = useCallback((node: HTMLTextAreaElement | null) => {
    node?.focus();
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-50 flex items-center justify-center',
        'px-12',
      )}
    >
      <textarea
        ref={focusOnMount}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        className={cn(
          'pointer-events-auto w-full resize-none bg-transparent text-center font-bold',
          'text-white outline-none',
        )}
        style={{ fontSize }}
      />
    </div>
  );
}
