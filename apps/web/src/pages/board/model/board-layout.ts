import type { UpdateBoardLayoutInput } from '@/entities/board/api/board-api';

export type LayoutSlot = {
  posX: number;
  posY: number;
  rotation: number;
  badgeOffsetX: number;
  badgeOffsetY: number;
};

type LaidOutSticker = LayoutSlot & { id: string; scale: number; zIndex: number };

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
