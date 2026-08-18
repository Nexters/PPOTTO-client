'use client';

import { Check, Close } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

type MoveHeaderProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export function MoveHeader({ onCancel, onConfirm }: MoveHeaderProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-60 flex flex-col',
        'items-start px-6 pt-5 pb-16',
      )}
      style={{ backgroundImage: 'linear-gradient(to bottom, black 29px, transparent)' }}
    >
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          aria-label="취소"
          onClick={onCancel}
          className="flex items-center justify-center bg-gray-800 rounded-full pointer-events-auto size-8"
        >
          <Close color="white" />
        </button>
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
