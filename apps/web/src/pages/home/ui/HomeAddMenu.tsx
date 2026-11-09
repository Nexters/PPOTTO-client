import { IconPlus } from '@ppotto/assets';
import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { Button, IconButton } from '@/shared/ui/common/Button';

type HomeAddMenuProps = {
  onCreateBoard?: () => void;
  onJoinByCode?: () => void;
};

const actionClassName =
  'bg-gray-200 px-3 whitespace-nowrap text-black disabled:bg-gray-200 disabled:text-black';

export function HomeAddMenu({ onCreateBoard, onJoinByCode }: HomeAddMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionsId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const runAction = (action?: () => void) => {
    if (!action) return;
    action();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex h-12 w-27.5 justify-end">
      <div
        id={actionsId}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={cn(
          'absolute right-0 bottom-14.5 flex flex-col items-end gap-2.5',
          'origin-bottom-right transition-[opacity,transform] duration-250',
          'ease-[cubic-bezier(0.22,1,0.36,1)]',
          'motion-reduce:transition-none',
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0',
        )}
      >
        <Button
          size="medium"
          disabled={!onCreateBoard}
          onClick={() => runAction(onCreateBoard)}
          className={cn(actionClassName, 'pointer-events-auto w-25.25')}
        >
          새 보드 만들기
        </Button>
        <Button
          size="medium"
          disabled={!onJoinByCode}
          onClick={() => runAction(onJoinByCode)}
          className={cn(actionClassName, 'pointer-events-auto w-27.5')}
        >
          코드로 참여하기
        </Button>
      </div>
      <IconButton
        aria-label={isOpen ? '보드 추가 메뉴 닫기' : '보드 추가 메뉴 열기'}
        aria-expanded={isOpen}
        aria-controls={actionsId}
        onClick={() => setIsOpen((open) => !open)}
        className={cn('pointer-events-auto', isOpen && 'bg-gray-800 text-white')}
      >
        <IconPlus color={isOpen ? 'white' : 'black'} />
      </IconButton>
    </div>
  );
}
