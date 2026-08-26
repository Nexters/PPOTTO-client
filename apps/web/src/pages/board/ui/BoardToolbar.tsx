import { IconDraw, IconHand, IconPlus, IconText } from '@ppotto/assets';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export type ToolbarMode = 'default' | 'draw' | 'text' | 'move';

type BoardToolbarProps = {
  mode: ToolbarMode;
  onModeChange: (mode: ToolbarMode) => void;
  onAddSticker: () => void;
  aboveModeSwitcher?: ReactNode;
};

export function BoardToolbar({
  mode,
  onModeChange,
  onAddSticker,
  aboveModeSwitcher,
}: BoardToolbarProps) {
  const toggle = (target: ToolbarMode) => {
    onModeChange(mode === target ? 'default' : target);
  };

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end',
        'justify-between px-6 pt-16',
      )}
      style={{
        paddingBottom:
          'calc(var(--rn-safe-area-inset-bottom, env(safe-area-inset-bottom)) + 0.875rem)',
        backgroundImage: 'linear-gradient(to top, black, transparent)',
      }}
    >
      <div className="flex flex-col items-start justify-center gap-4">
        {aboveModeSwitcher}
        <div
          className={cn(
            'pointer-events-auto flex items-center justify-center gap-2',
            'rounded-full bg-gray-800 p-2',
          )}
        >
          <button
            type="button"
            aria-label="그리기"
            onClick={() => toggle('draw')}
            className={cn(
              'flex size-8 items-center justify-center rounded-full',
              mode === 'draw' && 'bg-white',
            )}
          >
            <IconDraw color={mode === 'draw' ? 'black' : 'white'} />
          </button>
          <button
            type="button"
            aria-label="텍스트"
            onClick={() => toggle('text')}
            className={cn(
              'flex size-8 items-center justify-center rounded-full',
              mode === 'text' && 'bg-white',
            )}
          >
            <IconText color={mode === 'text' ? 'black' : 'white'} />
          </button>
          <button
            type="button"
            aria-label="선택"
            onClick={() => toggle('move')}
            className={cn(
              'flex size-8 items-center justify-center rounded-full',
              mode === 'move' && 'bg-white',
            )}
          >
            <IconHand color={mode === 'move' ? 'black' : 'white'} />
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="스티커 추가"
        onClick={onAddSticker}
        className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-white"
      >
        <IconPlus width={18} height={18} />
      </button>
    </div>
  );
}
