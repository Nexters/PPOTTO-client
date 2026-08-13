import type { UpdateBoardLayoutInput } from '@/entities/board/api/board-api';

import { centroid, distance, type Point } from './geometry';

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
// 뷰포트 세로/가로 비율을 세로 방향 퍼짐에 얼마나 반영할지 (1=비율 그대로, 0=반영 안 함/원형)
const VERTICAL_STRETCH_DAMPING = 0.5;

// 뱃지가 스티커를 너무 가리지 않으면서 위치에 변화를 주도록 6방향 중 하나를 랜덤으로 고름
const BADGE_OFFSET_PRESETS: { x: number; y: number }[] = [
  { x: 0, y: 60 }, // 아래 가운데
  { x: -45, y: 55 }, // 아래 왼쪽
  { x: 45, y: 55 }, // 아래 오른쪽
  { x: 0, y: -60 }, // 위 가운데
  { x: -45, y: -55 }, // 위 왼쪽
  { x: 45, y: -55 }, // 위 오른쪽
];

// 좌표/순서가 null이거나 없으면 아직 배치를 정하지 않은 스티커로 본다
export function needsInitialLayout(sticker: UnplacedCheckSticker): boolean {
  return sticker.posX == null || sticker.posY == null || sticker.zIndex == null;
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
// verticalStretch로 세로 방향 반지름을 늘려서, 뷰포트가 세로로 길수록 무리도 세로로 더 퍼지게 한다
function findNonOverlappingPoint(
  anchor: Point,
  placedPoints: Point[],
  restrictToRightward: boolean,
  random: () => number,
  verticalStretch: number,
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
        y: anchor.y + Math.sin(angle) * radius * verticalStretch,
      };

      const overlaps = placedPoints.some(
        (point) => distance(point, candidate) < MIN_STICKER_DISTANCE,
      );
      if (!overlaps) return candidate;
    }
  }

  return candidate;
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
  // 뷰포트가 세로로 길수록(세로/가로 비율이 클수록) 세로 방향으로 더 퍼지게 함
  const verticalStretch = 1 + (viewport.height / viewport.width - 1) * VERTICAL_STRETCH_DAMPING;
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
    const point = findNonOverlappingPoint(
      currentAnchor,
      placedPoints,
      restrictToRightward,
      random,
      verticalStretch,
    );

    placedPoints.push(point);
    newPoints.push(point);

    const badgeOffset = BADGE_OFFSET_PRESETS[Math.floor(random() * BADGE_OFFSET_PRESETS.length)]!;

    return {
      ...sticker,
      posX: point.x,
      posY: point.y,
      rotation: (random() * 2 - 1) * ROTATION_RANGE_DEG,
      badgeOffsetX: badgeOffset.x,
      badgeOffsetY: badgeOffset.y,
      zIndex: maxExistingZIndex + index + 1,
    };
  });
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
