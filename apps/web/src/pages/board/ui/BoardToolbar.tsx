import { IconDraw, IconHand, IconPlus, IconText } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

type BoardToolbarProps = {
  onAddSticker: () => void;
};

export function BoardToolbar({ onAddSticker }: BoardToolbarProps) {
  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-10 flex items-start justify-between',
        'px-6 pt-16 pb-12',
      )}
      style={{ backgroundImage: 'linear-gradient(to top, black, transparent)' }}
    >
      <div className="flex items-center justify-center gap-2 rounded-full bg-gray-800 p-2">
        <button
          type="button"
          aria-label="그리기"
          className="flex size-8 items-center justify-center rounded-full"
        >
          <IconDraw color="white" />
        </button>
        <button
          type="button"
          aria-label="텍스트"
          className="flex size-8 items-center justify-center rounded-full"
        >
          <IconText color="white" />
        </button>
        <button
          type="button"
          aria-label="선택"
          className="flex size-8 items-center justify-center rounded-full"
        >
          <IconHand color="white" />
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
