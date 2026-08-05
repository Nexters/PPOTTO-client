import type { UpdateBoardLayoutInput } from '@/entities/board/api/board-api';

export type LayoutSlot = {
  posX: number;
  posY: number;
  rotation: number;
  badgeOffsetX: number;
  badgeOffsetY: number;
};

export type ExistingSticker = {
  posX: number;
  posY: number;
  zIndex: number;
};

// 스티커 크기 정규화 규칙은 충돌 판정용 대표 반지름을 일단 이 값으로 임시로 정해두고 써보고 이상하면 조정할 예정
const STICKER_COLLISION_RADIUS = 85;
const MAX_PLACEMENT_ATTEMPTS = 50;
const ROTATION_RANGE_DEG = 15;
const BADGE_OFFSET = { x: 0, y: 60 };

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 새 스티커들이 들어갈 빈 사각형 영역을 정함
// 첫 배치면 뷰포트 중앙 근처, 기존 스티커가 있으면 기존 스티커들의 오른쪽
function clusterRegion(
  count: number,
  existingStickers: ExistingSticker[],
  viewport: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const size = Math.ceil(Math.sqrt(count)) * STICKER_COLLISION_RADIUS * 4;

  if (existingStickers.length === 0) {
    return {
      x: viewport.width / 2 - size / 2,
      y: viewport.height / 2 - size / 2,
      width: size,
      height: size,
    };
  }

  const rightEdge = Math.max(...existingStickers.map((sticker) => sticker.posX));
  const topEdge = Math.min(...existingStickers.map((sticker) => sticker.posY));
  const gap = STICKER_COLLISION_RADIUS * 2;

  return { x: rightEdge + gap, y: topEdge, width: size, height: size };
}

// 그 영역 안에서 새 스티커마다 기존 점들과 안겹치는 좌표 하나를 무작위로 찾음 (최대 50번 시도)
function findNonOverlappingPoint(
  region: { x: number; y: number; width: number; height: number },
  placedPoints: { x: number; y: number }[],
  random: () => number,
): { x: number; y: number } {
  let candidate = { x: region.x, y: region.y };

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
    candidate = {
      x: region.x + random() * region.width,
      y: region.y + random() * region.height,
    };

    const overlaps = placedPoints.some(
      (point) => distance(point, candidate) < STICKER_COLLISION_RADIUS * 2,
    );
    if (!overlaps) return candidate;
  }

  return candidate;
}

// 스티커들의 posX/posY가 전부 0인지(=아직 배치 안 됐는지) 확인
export function needsInitialLayout(stickers: { posX: number; posY: number }[]): boolean {
  return stickers.every((sticker) => sticker.posX === 0 && sticker.posY === 0);
}

// 새 스티커들에 빈 공간을 찾아 배치 -> 새 스티커 전체에 위치/회전/뱃지 오프셋/zIndex 적용
export function computeInitialLayout<T extends { id: string; type: string }>(
  newStickers: T[],
  existingStickers: ExistingSticker[],
  viewport: { width: number; height: number },
  random: () => number = Math.random,
): (T & LayoutSlot & { zIndex: number })[] {
  const region = clusterRegion(newStickers.length, existingStickers, viewport);
  const placedPoints = existingStickers.map((sticker) => ({ x: sticker.posX, y: sticker.posY }));
  const maxExistingZIndex = existingStickers.reduce(
    (max, sticker) => Math.max(max, sticker.zIndex),
    0,
  );

  return newStickers.map((sticker, index) => {
    const point = findNonOverlappingPoint(region, placedPoints, random);
    placedPoints.push(point);

    return {
      ...sticker,
      posX: point.x,
      posY: point.y,
      rotation: (random() * 2 - 1) * ROTATION_RANGE_DEG,
      badgeOffsetX: BADGE_OFFSET.x,
      badgeOffsetY: BADGE_OFFSET.y,
      zIndex: maxExistingZIndex + index + 1,
    };
  });
}

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
