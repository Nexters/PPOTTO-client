import type { UpdateBoardLayoutInput } from '@/entities/board/api/board-api';

export type LayoutSlot = {
  posX: number;
  posY: number;
  rotation: number;
  badgeOffsetX: number;
  badgeOffsetY: number;
};

type LaidOutSticker = LayoutSlot & { id: string; scale: number; zIndex: number };

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
