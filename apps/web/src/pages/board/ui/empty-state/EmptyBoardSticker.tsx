import { BigLogo, BigTitle } from '@ppotto/assets';
import type { PointerEvent } from 'react';

import { cn } from '@/shared/lib/cn';
import { useLongPress } from '@/shared/lib/use-long-press';

import { EmptyBoardStickerTitle } from './EmptyBoardStickerTitle';

type EmptyBoardStickerProps = {
  title: string;
  isQuickMenuOpen: boolean;
  onLongPress: () => void;
};

export const EMPTY_BOARD_STICKER_DEFAULT_TITLE = 'PPOTTO를 3초간 꾹 눌러보세요 👆';

export function EmptyBoardSticker({ title, isQuickMenuOpen, onLongPress }: EmptyBoardStickerProps) {
  const longPress = useLongPress({
    onLongPress: () => {
      console.warn('[empty-board-sticker] longpress');
      onLongPress();
    },
  });
  const pointOf = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY });

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 flex items-center justify-center',
        isQuickMenuOpen ? 'z-55' : 'z-10',
      )}
    >
      <div
        role="img"
        aria-label={title}
        className={cn(
          'relative h-34 w-72.75 transition-transform duration-250 ease-out',
          isQuickMenuOpen
            ? 'pointer-events-none scale-[1.2]'
            : 'pointer-events-auto translate-x-3.75 -translate-y-16.25',
        )}
        onPointerDown={(event) => {
          console.warn('[empty-board-sticker] pointerdown', {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            point: pointOf(event),
          });
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
            console.warn('[empty-board-sticker] pointer capture set');
          } catch (error) {
            console.error('[empty-board-sticker] pointer capture failed', error);
          }
          longPress.start(pointOf(event), 'empty-board-sticker');
        }}
        onPointerMove={(event) => {
          console.warn('[empty-board-sticker] pointermove', pointOf(event));
          longPress.move(pointOf(event));
        }}
        onPointerUp={() => {
          console.warn('[empty-board-sticker] pointerup');
          longPress.cancel();
        }}
        onPointerCancel={() => {
          console.warn('[empty-board-sticker] pointercancel');
          longPress.cancel();
        }}
      >
        <div
          className={cn(
            'absolute top-13.75 left-0 h-20.25 w-65.5',
            'transition-transform duration-250 ease-out',
            isQuickMenuOpen && 'translate-x-[14.5px] -translate-y-13.75',
          )}
        >
          <BigLogo aria-hidden width={262} height={81} />
        </div>
        <div
          className={cn(
            'absolute top-0 right-0 h-12.75 w-47.75',
            'transition-transform duration-250 ease-out',
            isQuickMenuOpen && '-translate-x-12.5 translate-y-21.25 rotate-[-6.18deg]',
          )}
        >
          {title === EMPTY_BOARD_STICKER_DEFAULT_TITLE ? (
            <BigTitle aria-hidden width={191} height={51} />
          ) : (
            <EmptyBoardStickerTitle aria-hidden title={title} />
          )}
        </div>
      </div>
    </div>
  );
}
