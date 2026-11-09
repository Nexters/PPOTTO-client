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

const ACTION_TRANSITION =
  'transition-[opacity,transform] motion-reduce:transition-none motion-reduce:transform-none';
const OPEN_TRANSITION = 'duration-220 ease-[cubic-bezier(0.16,1,0.3,1)]';
const CLOSE_TRANSITION = 'duration-180 ease-[cubic-bezier(0.4,0,0.2,1)]';

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
        className="absolute right-0 bottom-14.5 flex flex-col items-end gap-2.5"
      >
        <Button
          size="medium"
          disabled={!onCreateBoard}
          onClick={() => runAction(onCreateBoard)}
          className={cn(
            actionClassName,
            'pointer-events-auto w-25.25 origin-bottom-right',
            ACTION_TRANSITION,
            isOpen
              ? cn(OPEN_TRANSITION, 'translate-y-0 scale-100 opacity-100 delay-40')
              : cn(
                  CLOSE_TRANSITION,
                  'pointer-events-none translate-y-2 scale-98 opacity-0 delay-0',
                ),
          )}
        >
          새 보드 만들기
        </Button>
        <Button
          size="medium"
          disabled={!onJoinByCode}
          onClick={() => runAction(onJoinByCode)}
          className={cn(
            actionClassName,
            'pointer-events-auto w-27.5 origin-bottom-right',
            ACTION_TRANSITION,
            isOpen
              ? cn(OPEN_TRANSITION, 'translate-y-0 scale-100 opacity-100 delay-0')
              : cn(
                  CLOSE_TRANSITION,
                  'pointer-events-none translate-y-2 scale-98 opacity-0 delay-0',
                ),
          )}
        >
          코드로 참여하기
        </Button>
      </div>
      <IconButton
        aria-label={isOpen ? '보드 추가 메뉴 닫기' : '보드 추가 메뉴 열기'}
        aria-expanded={isOpen}
        aria-controls={actionsId}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'pointer-events-auto transition-colors duration-200 ease-out motion-reduce:transition-none',
          isOpen && 'bg-gray-800 text-white',
        )}
      >
        <IconPlus color={isOpen ? 'white' : 'black'} />
      </IconButton>
    </div>
  );
}
