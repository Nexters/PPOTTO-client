'use client';

import { Trash } from '@ppotto/assets';
import type { Ref } from 'react';

import { cn } from '@/shared/lib/cn';

type DrawingDeleteBarProps = {
  trashButtonRef?: Ref<HTMLButtonElement>;
  isDragOver?: boolean;
};

export function DrawingDeleteBar({ trashButtonRef, isDragOver }: DrawingDeleteBarProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col',
        'items-center gap-4 px-6 pt-16 pb-12',
      )}
      style={{ backgroundImage: 'linear-gradient(to top, black, transparent)' }}
    >
      <p className="text-body-06 text-gray-300">삭제하려면 끌어다 놓으세요</p>
      <button
        ref={trashButtonRef}
        type="button"
        aria-label="삭제"
        className={cn(
          'pointer-events-auto flex size-12 items-center justify-center rounded-full',
          'bg-white transition-transform duration-150 ease-out',
          isDragOver && 'scale-125',
        )}
      >
        <Trash color="#181818" width={28} height={28} />
      </button>
    </div>
  );
}
