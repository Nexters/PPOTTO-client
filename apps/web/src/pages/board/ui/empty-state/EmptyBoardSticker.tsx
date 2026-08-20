import { BigLogo } from '@ppotto/assets';
import type { PointerEvent } from 'react';
import { useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { useLongPress } from '@/shared/lib/use-long-press';

import type { StickerTransform } from '../../model/board-transform';

import { EmptyBoardStickerTitle } from './EmptyBoardStickerTitle';

type EmptyBoardStickerProps = {
  title: string;
  isQuickMenuOpen: boolean;
  isEditMode: boolean;
  transform: StickerTransform;
  onClick: () => void;
  onLongPress: () => void;
};

export const EMPTY_BOARD_STICKER_ID = 'empty-board-sticker';
export const EMPTY_BOARD_STICKER_DEFAULT_TITLE = 'PPOTTO를 눌러보세요👆';
export const EMPTY_BOARD_STICKER_WIDTH = 291;
export const EMPTY_BOARD_STICKER_HEIGHT = 136;

// 삭제 시 이번 세션 동안만 숨긴다 — 앱을 완전히 종료했다 다시 켜면(웹뷰 새 로드) 초기화
let hiddenThisSession = false;
export const isEmptyBoardStickerHidden = () => hiddenThisSession;
export const hideEmptyBoardStickerForSession = () => {
  hiddenThisSession = true;
};

export function EmptyBoardSticker({
  title,
  isQuickMenuOpen,
  isEditMode,
  transform,
  onClick,
  onLongPress,
}: EmptyBoardStickerProps) {
  const stickerRef = useRef<HTMLDivElement>(null);
  const didLongPressRef = useRef(false);
  // 롱프레스가 성사되면 onPressEnd가 불리지 않아 data-pressed가 남는다. 속성이 남은 채로
  // 다시 누르면 값이 안 바뀌어 CSS 애니메이션이 재시작되지 않으므로, 손을 떼는 모든
  // 경로에서 직접 걷어낸다
  const clearPressed = () => stickerRef.current?.removeAttribute('data-pressed');
  const longPress = useLongPress({
    onLongPress: () => {
      didLongPressRef.current = true;
      console.warn('[empty-board-sticker] longpress');
      onLongPress();
      // 바텀시트가 열리면 pointerup이 유실될 수 있으므로 성사 직후 바로 걷는다.
      clearPressed();
    },
    onPressEnd: clearPressed,
  });
  const pointOf = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY });

  const sticker = (
    <div
      ref={stickerRef}
      role="img"
      aria-label={title}
      data-sticker-id={isQuickMenuOpen ? undefined : EMPTY_BOARD_STICKER_ID}
      className={cn(
        'relative',
        isQuickMenuOpen
          ? 'pointer-events-none scale-[1.2] transition-transform duration-250 ease-out'
          : 'pointer-events-auto',
      )}
      style={{
        width: EMPTY_BOARD_STICKER_WIDTH,
        height: EMPTY_BOARD_STICKER_HEIGHT,
        ...(isQuickMenuOpen
          ? undefined
          : {
              position: 'absolute',
              left: transform.x,
              top: transform.y,
              transform: `translate(-50%, -50%) rotate(${transform.rotation}deg) scale(${transform.scale})`,
              willChange: 'transform',
              touchAction: 'none',
            }),
      }}
      onClick={
        isEditMode
          ? undefined
          : () => {
              if (!didLongPressRef.current) onClick();
              didLongPressRef.current = false;
            }
      }
      onPointerDown={
        isEditMode
          ? undefined
          : (event) => {
              didLongPressRef.current = false;
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
              longPress.start(pointOf(event), EMPTY_BOARD_STICKER_ID);
              event.currentTarget.dataset.pressed = 'true';
            }
      }
      onPointerMove={
        isEditMode
          ? undefined
          : (event) => {
              console.warn('[empty-board-sticker] pointermove', pointOf(event));
              longPress.move(pointOf(event));
            }
      }
      onPointerUp={
        isEditMode
          ? undefined
          : () => {
              console.warn('[empty-board-sticker] pointerup');
              longPress.cancel();
              clearPressed();
            }
      }
      onPointerCancel={
        isEditMode
          ? undefined
          : () => {
              console.warn('[empty-board-sticker] pointercancel');
              longPress.cancel();
              clearPressed();
            }
      }
    >
      <div className="relative w-full h-full sticker-long-press-visual">
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
            // 제목이 텍스트 길이에 맞게 늘고 줄 수 있게 폭을 고정하지 않는다 — 오른쪽 끝 기준 정렬
            'absolute top-0 right-0 flex justify-end',
            'transition-transform duration-250 ease-out',
            isQuickMenuOpen && '-translate-x-12.5 translate-y-21.25 rotate-[-6.18deg]',
          )}
        >
          <EmptyBoardStickerTitle aria-hidden title={title} />
        </div>
      </div>
    </div>
  );

  if (!isQuickMenuOpen) return sticker;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-55">
      {sticker}
    </div>
  );
}
