import { type RefObject, useEffect } from 'react';

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
};

export function useStickerCoachMark({
  container,
  cameraRef,
  requestFocus,
  userId,
  isActive,
  stickers,
  findStickerElements,
}: UseStickerCoachMarkParams) {
  const coachMark = useCoachMarkAnchor({
    coachMarkId: STICKER_MENU_COACH_MARK_ID,
    userId,
    container,
    cameraRef,
    requestFocus,
  });

  useEffect(() => {
    if (!isActive || !container) return;
    const stickerId = peekLastViewedRecapSticker();
    if (!stickerId) return;

    if (stickers.length === 0) return;
    consumeLastViewedRecapSticker();

    const sticker = stickers.find((item) => item.id === stickerId);
    if (!sticker) return;

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
