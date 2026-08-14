'use client';

import { Check, Reload } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

type DrawingHeaderProps = {
  canUndo: boolean;
  onUndo: () => void;
  onConfirm: () => void;
};

export function DrawingHeader({ canUndo, onUndo, onConfirm }: DrawingHeaderProps) {
  return (
    <div
      className={cn('absolute inset-x-0 top-0 z-60 flex flex-col items-start', 'px-6 pb-10')}
      style={{ backgroundImage: 'linear-gradient(to bottom, black 46%, transparent)' }}
    >
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          aria-label="실행취소"
          disabled={!canUndo}
          onClick={onUndo}
          className="flex size-8 items-center justify-center rounded-full bg-gray-800 disabled:opacity-40"
        >
          <Reload color="white" />
        </button>
        <button
          type="button"
          aria-label="확정"
          onClick={onConfirm}
          className="flex size-8 items-center justify-center rounded-full bg-gray-800"
        >
          <Check color="white" />
        </button>
      </div>
    </div>
  );
}
