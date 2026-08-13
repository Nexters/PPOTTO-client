import { IconDraw, IconHand, IconPlus, IconText } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

export type ToolbarMode = 'default' | 'draw' | 'text' | 'move';

type BoardToolbarProps = {
  mode: ToolbarMode;
  onModeChange: (mode: ToolbarMode) => void;
  onAddSticker: () => void;
};

export function BoardToolbar({ mode, onModeChange, onAddSticker }: BoardToolbarProps) {
  const toggle = (target: ToolbarMode) => {
    onModeChange(mode === target ? 'default' : target);
  };

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-10 flex items-start justify-between',
        'px-6 pt-16',
      )}
      style={{ backgroundImage: 'linear-gradient(to top, black, transparent)' }}
    >
      <div className="flex items-center justify-center gap-2 rounded-full bg-gray-800 p-2">
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
      <button
        type="button"
        aria-label="스티커 추가"
        onClick={onAddSticker}
        className="flex size-12 items-center justify-center rounded-full bg-white"
      >
        <IconPlus width={18} height={18} />
      </button>
    </div>
  );
}
