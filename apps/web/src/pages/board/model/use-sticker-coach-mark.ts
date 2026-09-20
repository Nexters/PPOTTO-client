import { type RefObject, useEffect, useState } from 'react';

import { type CameraState, computeStickerFitTargets } from './board-camera';
import {
  consumeLastViewedRecapSticker,
  peekLastViewedRecapSticker,
} from './last-viewed-recap-sticker';
import { useCoachMarkAnchor } from './use-coach-mark-anchor';

const STICKER_MENU_COACH_MARK_ID = 'sticker-menu';

type StickerLike = { id: string; posX: number; posY: number };

type UseStickerCoachMarkParams = {
  container: HTMLDivElement | null;
  cameraRef: RefObject<CameraState>;
  requestFocus: (target: CameraState, onComplete?: () => void) => void;
  userId: string | undefined;
  isActive: boolean;
  stickers: StickerLike[];
  findStickerElements: (stickerId: string) => HTMLElement[];
  quickMenuStickerId: string | null;
};

export function useStickerCoachMark({
  container,
  cameraRef,
  requestFocus,
  userId,
  isActive,
  stickers,
  findStickerElements,
  quickMenuStickerId,
}: UseStickerCoachMarkParams) {
  const [anchoredStickerId, setAnchoredStickerId] = useState<string | null>(null);

  const coachMark = useCoachMarkAnchor({
    coachMarkId: STICKER_MENU_COACH_MARK_ID,
    userId,
    container,
    cameraRef,
    requestFocus,
    dismissWhen: anchoredStickerId !== null && anchoredStickerId === quickMenuStickerId,
  });

  useEffect(() => {
    if (!isActive || !container) return;
    const stickerId = peekLastViewedRecapSticker();
    if (!stickerId) return;

    if (stickers.length === 0) return;
    consumeLastViewedRecapSticker();

    const sticker = stickers.find((item) => item.id === stickerId);
    if (!sticker) return;

    // "보드로 돌아옴"이라는 외부 이벤트에 대한 반응이라 derived state가 아니다 —
    // use-draw-mode.ts의 모드 종료 처리와 같은 이유로 렌더 중 계산할 수 없다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnchoredStickerId(stickerId);
    coachMark.show(
      () => findStickerElements(stickerId).at(-1) ?? null,
      computeStickerFitTargets([sticker]),
    );
  }, [isActive, container, stickers, findStickerElements, coachMark]);

  return {
    anchorElement: coachMark.anchorElement,
    anchorKey: coachMark.anchorKey,
    onDismiss: coachMark.onDismiss,
  };
}
