'use client';

import { Check, Undo } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

type DrawingHeaderProps = {
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onConfirm: () => void;
};

export function DrawingHeader({ canUndo, onUndo, canRedo, onRedo, onConfirm }: DrawingHeaderProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-60 flex flex-col',
        'items-start px-6 pt-5 pb-16',
      )}
      style={{ backgroundImage: 'linear-gradient(to bottom, black 29px, transparent)' }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="실행취소"
            disabled={!canUndo}
            onClick={onUndo}
            className={cn(
              'pointer-events-auto flex size-8 items-center justify-center rounded-full',
              'bg-gray-800 disabled:opacity-40',
            )}
          >
            <Undo color="white" />
          </button>
          <button
            type="button"
            aria-label="다시실행"
            disabled={!canRedo}
            onClick={onRedo}
            className={cn(
              'pointer-events-auto flex size-8 items-center justify-center rounded-full',
              'bg-gray-800 disabled:opacity-40',
            )}
          >
            <span className="flex -scale-x-100">
              <Undo color="white" />
            </span>
          </button>
        </div>
        <button
          type="button"
          aria-label="확정"
          onClick={onConfirm}
          className="flex items-center justify-center bg-gray-800 rounded-full pointer-events-auto size-8"
        >
          <Check color="white" />
        </button>
      </div>
    </div>
  );
}
