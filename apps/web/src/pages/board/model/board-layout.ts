import type { UpdateBoardLayoutInput } from '@/entities/board/api/board-api';

import { centroid, type Point } from './geometry';

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
// 스티커 두 개가 이 거리보다 가까우면 겹친 것으로 봄
const MIN_STICKER_DISTANCE = STICKER_COLLISION_RADIUS * 2;

const ANGLE_STEPS = 24; // 한 바퀴를 몇 칸으로 나눠 검사할지 (15도 간격)
const RADIUS_STEP = 15; // 한 바퀴 돌 때마다 반지름을 얼마나 늘릴지
const MAX_RINGS = 300; // 최대 탐색 반지름 = RADIUS_STEP * MAX_RINGS
const ROTATION_RANGE_DEG = 15;
const BADGE_OFFSET = { x: 0, y: 60 };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 새 스티커 무리가 시작될 기준점을 찾음. 첫 배치면 뷰포트 중앙, 기존 스티커가 있으면 그 오른쪽.
function startAnchor(
  existingStickers: ExistingSticker[],
  viewport: { width: number; height: number },
): Point {
  if (existingStickers.length === 0) {
    return { x: viewport.width / 2, y: viewport.height / 2 };
  }

  const rightEdge = Math.max(...existingStickers.map((sticker) => sticker.posX));
  const topEdge = Math.min(...existingStickers.map((sticker) => sticker.posY));
  return { x: rightEdge + MIN_STICKER_DISTANCE, y: topEdge };
}

// 기준점에서 나선형으로 훑어서 안 겹치는 첫 자리를 찾음
// 기존 스티커가 있을때는 오른쪽으로만 훑어서 겹치지 않게 함
function findNonOverlappingPoint(
  anchor: Point,
  placedPoints: Point[],
  restrictToRightward: boolean,
  random: () => number,
): Point {
  const angleRange = restrictToRightward ? Math.PI : Math.PI * 2;
  const angleStart = (restrictToRightward ? -Math.PI / 2 : 0) + random() * angleRange;

  let candidate = anchor;

  for (let ring = 1; ring <= MAX_RINGS; ring += 1) {
    const radius = ring * RADIUS_STEP;

    for (let step = 0; step < ANGLE_STEPS; step += 1) {
      const angle = angleStart + (step / ANGLE_STEPS) * angleRange;
      candidate = {
        x: anchor.x + Math.cos(angle) * radius,
        y: anchor.y + Math.sin(angle) * radius,
      };

      const overlaps = placedPoints.some(
        (point) => distance(point, candidate) < MIN_STICKER_DISTANCE,
      );
      if (!overlaps) return candidate;
    }
  }

  return candidate;
}

// 스티커들의 posX/posY가 전부 0인지(=아직 배치 안 됐는지) 확인
export function needsInitialLayout(stickers: { posX: number; posY: number }[]): boolean {
  return stickers.every((sticker) => sticker.posX === 0 && sticker.posY === 0);
}

// 새 스티커들을 배치 -> 새 스티커 전체에 위치/회전/뱃지 오프셋/zIndex 적용
export function computeInitialLayout<T extends { id: string; type: string }>(
  newStickers: T[],
  existingStickers: ExistingSticker[],
  viewport: { width: number; height: number },
  random: () => number = Math.random,
): (T & LayoutSlot & { zIndex: number })[] {
  //  무리가 시작될 기준점 (뷰포트 중앙 또는 기존 스티커 오른쪽)
  const anchor = startAnchor(existingStickers, viewport);
  // 기존 스티커가 있으면, 이후 모든 탐색을 오른쪽 반원으로만 제한
  const restrictToRightward = existingStickers.length > 0;
  // 충돌 검사 대상 목록 (이전에 놓은 스티커들)
  const placedPoints = existingStickers.map((sticker) => ({ x: sticker.posX, y: sticker.posY }));
  // 지금까지 놓은 새 스티커 좌표들 모음 (기준점을 다시 잡을 때 중심점 계산용)
  const newPoints: Point[] = [];
  const maxExistingZIndex = existingStickers.reduce(
    (max, sticker) => Math.max(max, sticker.zIndex),
    0,
  );

  return newStickers.map((sticker, index) => {
    // 중심점 계산
    const currentAnchor = newPoints.length === 0 ? anchor : centroid(newPoints);
    // 중심점 기준으로 나선형으로 자리 찾음
    const point = findNonOverlappingPoint(currentAnchor, placedPoints, restrictToRightward, random);

    placedPoints.push(point);
    newPoints.push(point);

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
