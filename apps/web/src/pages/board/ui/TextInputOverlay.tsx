'use client';

import { useCallback } from 'react';

import { cn } from '@/shared/lib/cn';

type TextInputOverlayProps = {
  value: string;
  onChange: (value: string) => void;
  fontSize: number;
};

function fitHeight(node: HTMLTextAreaElement) {
  node.style.height = 'auto';
  node.style.height = `${node.scrollHeight}px`;
}

export function TextInputOverlay({ value, onChange, fontSize }: TextInputOverlayProps) {
  const setRef = useCallback((node: HTMLTextAreaElement | null) => {
    if (!node) return;
    node.focus();
    fitHeight(node);
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-50 flex items-center justify-center',
        'pr-12 pl-16',
      )}
    >
      <textarea
        ref={setRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          fitHeight(e.target);
        }}
        rows={1}
        className={cn(
          'pointer-events-auto w-full min-w-0 resize-none bg-transparent text-center font-bold',
          'text-white outline-none',
        )}
        style={{ fontSize }}
      />
    </div>
  );
}
