import { BigLogo, BigTitle } from '@ppotto/assets';
import type { PointerEvent } from 'react';
import { useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { useLongPress } from '@/shared/lib/use-long-press';

import { EmptyBoardStickerTitle } from './EmptyBoardStickerTitle';

type EmptyBoardStickerProps = {
  title: string;
  isQuickMenuOpen: boolean;
  onLongPress: () => void;
};

export const EMPTY_BOARD_STICKER_DEFAULT_TITLE = 'PPOTTO를 3초간 꾹 눌러보세요 👆';

// 삭제 시 이번 세션 동안만 숨긴다 — 앱을 완전히 종료했다 다시 켜면(웹뷰 새 로드) 초기화
let hiddenThisSession = false;
export const isEmptyBoardStickerHidden = () => hiddenThisSession;
export const hideEmptyBoardStickerForSession = () => {
  hiddenThisSession = true;
};

export function EmptyBoardSticker({ title, isQuickMenuOpen, onLongPress }: EmptyBoardStickerProps) {
  const stickerRef = useRef<HTMLDivElement>(null);
  // 롱프레스가 성사되면 onPressEnd가 불리지 않아 data-pressed가 남는다. 속성이 남은 채로
  // 다시 누르면 값이 안 바뀌어 CSS 애니메이션이 재시작되지 않으므로, 손을 떼는 모든
  // 경로에서 직접 걷어낸다
  const clearPressed = () => stickerRef.current?.removeAttribute('data-pressed');
  const longPress = useLongPress({
    onLongPress: () => {
      console.warn('[empty-board-sticker] longpress');
      onLongPress();
      // 성사 직후 바로 걷는다. 손 뗄 때까지 미루면 온보딩이 보드를 덮어(display:none)
      // pointerup이 유실돼 속성이 남고, 돌아왔을 때 애니메이션이 처음부터 다시 돈다
      clearPressed();
    },
    onPressEnd: clearPressed,
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
        ref={stickerRef}
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
          event.currentTarget.dataset.pressed = 'true';
        }}
        onPointerMove={(event) => {
          console.warn('[empty-board-sticker] pointermove', pointOf(event));
          longPress.move(pointOf(event));
        }}
        onPointerUp={() => {
          console.warn('[empty-board-sticker] pointerup');
          longPress.cancel();
          clearPressed();
        }}
        onPointerCancel={() => {
          console.warn('[empty-board-sticker] pointercancel');
          longPress.cancel();
          clearPressed();
        }}
      >
        <div className="sticker-long-press-visual relative h-full w-full">
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
            {title === EMPTY_BOARD_STICKER_DEFAULT_TITLE ? (
              <BigTitle aria-hidden width={191} height={51} />
            ) : (
              <EmptyBoardStickerTitle aria-hidden title={title} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
