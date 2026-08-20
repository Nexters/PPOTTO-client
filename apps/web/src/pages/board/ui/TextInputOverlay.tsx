'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

import { cn } from '@/shared/lib/cn';

import { BOARD_TEXT_STYLE } from './board-text-style';

type TextInputOverlayProps = {
  value: string;
  onChange: (value: string) => void;
  fontSize: number;
  onNodeChange?: (node: HTMLTextAreaElement | null) => void;
};

function fitHeight(node: HTMLTextAreaElement) {
  node.style.height = 'auto';
  node.style.height = `${node.scrollHeight}px`;
}

export function TextInputOverlay({
  value,
  onChange,
  fontSize,
  onNodeChange,
}: TextInputOverlayProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textAreaRef.current = node;
      if (node) {
        node.focus();
        fitHeight(node);
      }
      onNodeChange?.(node);
    },
    [onNodeChange],
  );

  useLayoutEffect(() => {
    if (textAreaRef.current) fitHeight(textAreaRef.current);
  }, [fontSize, value]);

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
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        className={cn(
          'pointer-events-auto w-full min-w-0 resize-none overflow-hidden border-0',
          'bg-transparent p-0 text-white outline-none',
        )}
        style={{ ...BOARD_TEXT_STYLE, fontSize }}
      />
    </div>
  );
}
