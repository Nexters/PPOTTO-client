import type { UpdateBoardLayoutInput } from '@/entities/board/api/board-api';

export type LayoutSlot = {
  posX: number;
  posY: number;
  rotation: number;
  badgeOffsetX: number;
  badgeOffsetY: number;
};

type LaidOutSticker = LayoutSlot & { id: string; scale: number; zIndex: number };

export type UnplacedCheckSticker = {
  posX?: number | null;
  posY?: number | null;
  zIndex?: number | null;
};

// 좌표/순서가 null이거나 없으면 아직 배치를 정하지 않은 스티커로 본다
export function needsInitialLayout(sticker: UnplacedCheckSticker): boolean {
  return sticker.posX == null || sticker.posY == null || sticker.zIndex == null;
}

// 스티커를 선택하면 다른 스티커보다 항상 위에 보이도록 zIndex를 맨 위로 올림
export function computeBringToFrontZIndex(
  stickers: { id: string; zIndex: number }[],
  selectedId: string,
): number | null {
  const selected = stickers.find((sticker) => sticker.id === selectedId);
  if (!selected) return null;

  const maxZIndex = Math.max(...stickers.map((sticker) => sticker.zIndex));
  if (selected.zIndex === maxZIndex) return null;

  return maxZIndex + 1;
}

export function computeTopZIndex(items: { zIndex: number }[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.zIndex)) + 1;
}

// 배치 결과를 저장 API가 요구하는 요청 바디 형태로 변환
export function toLayoutInput(stickers: LaidOutSticker[]): UpdateBoardLayoutInput {
  return {
    stickers: stickers.map(
      ({ id, posX, posY, rotation, scale, zIndex, badgeOffsetX, badgeOffsetY }) => ({
        id,
        posX,
        posY,
        rotation,
        scale,
        zIndex,
        badgeOffsetX,
        badgeOffsetY,
        badgeRotation: -rotation,
      }),
    ),
  };
}
