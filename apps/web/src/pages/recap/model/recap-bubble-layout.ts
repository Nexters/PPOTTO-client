import type { OccupancyGrid } from './get-sticker-content-bounds';

export type BubbleSize = { width: number; height: number };
export type PlacedBubble = { id: string; posX: number; posY: number };

type Rect = { posX: number; posY: number } & BubbleSize;
type Side = 'left' | 'right';

const GAP = 8;
export const GRID_STEP = 8; // 후보 탐색 간격(px). 스티커 점유 격자의 셀 크기와 일치 필요

function overlaps(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.posX - b.posX) < (a.width + b.width) / 2 + GAP &&
    Math.abs(a.posY - b.posY) < (a.height + b.height) / 2 + GAP
  );
}

// 스티커 실제 불투명 격자와의 겹침 판정(사각형 대신 모양 그대로). grid는 스티커 중심 원점 좌표계
function overlapsGrid(rect: Rect, grid: OccupancyGrid): boolean {
  const gridWidth = grid.cols * grid.cellSize;
  const gridHeight = grid.rows * grid.cellSize;

  const left = rect.posX - rect.width / 2 - GAP + gridWidth / 2;
  const right = rect.posX + rect.width / 2 + GAP + gridWidth / 2;
  const top = rect.posY - rect.height / 2 - GAP + gridHeight / 2;
  const bottom = rect.posY + rect.height / 2 + GAP + gridHeight / 2;

  const colStart = Math.max(0, Math.floor(left / grid.cellSize));
  const colEnd = Math.min(grid.cols - 1, Math.ceil(right / grid.cellSize) - 1);
  const rowStart = Math.max(0, Math.floor(top / grid.cellSize));
  const rowEnd = Math.min(grid.rows - 1, Math.ceil(bottom / grid.cellSize) - 1);

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      if (grid.occupied[row * grid.cols + col]) return true;
    }
  }
  return false;
}

function overlapsSticker(rect: Rect, sticker: Rect, grid: OccupancyGrid | null): boolean {
  if (grid) return overlapsGrid(rect, grid);
  return overlaps(rect, sticker);
}

// 컨테이너 전체가 후보 범위(경계 이탈 자체가 불가능). side는 검색 범위가 아니라 정렬 우선순위로만
// 적용 — 절반만 검색하면 반대쪽에 자리가 있어도 못 찾음. 위/아래/대각선도 "옆"과 동등한 후보
function candidatePositions(
  size: BubbleSize,
  container: { width: number; height: number },
  side: Side,
): Rect[] {
  const halfW = container.width / 2 - size.width / 2;
  const halfH = container.height / 2 - size.height / 2;
  if (halfW < 0 || halfH < 0) return [{ posX: 0, posY: 0, ...size }]; // 버블이 컨테이너보다 큰 극단적 경우

  const candidates: Rect[] = [];
  for (let y = -halfH; y <= halfH; y += GRID_STEP) {
    for (let x = -halfW; x <= halfW; x += GRID_STEP) {
      candidates.push({ posX: x, posY: y, ...size });
    }
  }

  // posX=0(스티커 정중앙 위/아래)은 어느 side로도 인정 안 함 — 양쪽이 동시에 그 자리를
  // "가장 가까움"으로 골라 한 축에 몰리는 것 방지
  const sideSign = side === 'right' ? 1 : -1;
  return candidates.sort((a, b) => {
    const aOffSide = a.posX * sideSign > 0 ? 0 : 1;
    const bOffSide = b.posX * sideSign > 0 ? 0 : 1;
    const aDist = Math.hypot(a.posX, a.posY);
    const bDist = Math.hypot(b.posX, b.posY);
    return aOffSide - bOffSide || aDist - bDist;
  });
}

function findPosition(
  size: BubbleSize,
  stickerBounds: BubbleSize,
  stickerGrid: OccupancyGrid | null,
  placed: Rect[],
  container: { width: number; height: number },
  side: Side,
): { posX: number; posY: number } {
  const stickerRect: Rect = { posX: 0, posY: 0, ...stickerBounds };
  const candidates = candidatePositions(size, container, side);

  // 스티커와의 비겹침은 협상 불가 조건 — 검색 대상 자체를 여기로 제한
  const stickerFree = candidates.filter((c) => !overlapsSticker(c, stickerRect, stickerGrid));

  const clear = stickerFree.find((c) => !placed.some((p) => overlaps(c, p)));
  if (clear) return { posX: clear.posX, posY: clear.posY };

  // fallback: 다른 버블과는 겹쳐도 스티커와는 항상 안 겹치는 자리
  if (stickerFree[0]) return { posX: stickerFree[0].posX, posY: stickerFree[0].posY };

  // 버블 자체가 컨테이너보다 큰 등 스티커조차 피할 수 없는 극단적 입력(미검증)
  return { posX: candidates[0]!.posX, posY: candidates[0]!.posY };
}

// 좌표는 스티커 중심 기준 오프셋(translate(posX, posY)와 동일 좌표계)
// stickerGrid 미제공 시 stickerBounds 사각형으로 대체
export function placeBubbles(
  bubbles: (BubbleSize & { id: string })[],
  stickerBounds: BubbleSize,
  container: { width: number; height: number },
  stickerGrid: OccupancyGrid | null = null,
): PlacedBubble[] {
  const placed: Rect[] = [];

  return bubbles.map((bubble, index) => {
    const side: Side = index % 2 === 0 ? 'right' : 'left';
    const position = findPosition(bubble, stickerBounds, stickerGrid, placed, container, side);
    placed.push({ ...position, width: bubble.width, height: bubble.height });
    return { id: bubble.id, posX: position.posX, posY: position.posY };
  });
}
