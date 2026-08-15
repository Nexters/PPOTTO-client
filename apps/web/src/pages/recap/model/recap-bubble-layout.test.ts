// 좌표계: 스티커 중심이 원점(0,0)
// 제외: 버블이 컨테이너보다 큰 극단적 케이스(fallback 동작 미검증)
import { describe, expect, it } from 'vitest';

import type { OccupancyGrid } from './get-sticker-content-bounds';
import { placeBubbles } from './recap-bubble-layout';

// overlaps() 재사용 대신 스펙 독립 검증
function rectsOverlap(
  a: { posX: number; posY: number; width: number; height: number },
  b: { posX: number; posY: number; width: number; height: number },
): boolean {
  return (
    Math.abs(a.posX - b.posX) < (a.width + b.width) / 2 &&
    Math.abs(a.posY - b.posY) < (a.height + b.height) / 2
  );
}

describe('placeBubbles', () => {
  const container = { width: 1000, height: 1000 };
  const stickerBounds = { width: 100, height: 100 };
  const stickerRect = { posX: 0, posY: 0, ...stickerBounds };

  it('버블 하나는 스티커와 겹치지 않는 자리에 배치된다', () => {
    const bubbleSize = { width: 40, height: 20 };

    const [placed] = placeBubbles([{ id: 'a', ...bubbleSize }], stickerBounds, container);

    expect(rectsOverlap(stickerRect, { ...placed!, ...bubbleSize })).toBe(false);
  });

  it('여러 버블은 스티커와도, 서로와도 겹치지 않게 배치된다', () => {
    const bubbles = [
      { id: 'a', width: 40, height: 20 },
      { id: 'b', width: 60, height: 20 },
      { id: 'c', width: 30, height: 40 },
      { id: 'd', width: 50, height: 24 },
    ];

    const result = placeBubbles(bubbles, stickerBounds, container);
    const rects = result.map((placed, i) => ({ ...placed, ...bubbles[i]! }));

    rects.forEach((rect) => {
      expect(rectsOverlap(stickerRect, rect)).toBe(false);
    });
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        expect(rectsOverlap(rects[i]!, rects[j]!)).toBe(false);
      }
    }
  });

  it('배치 결과는 컨테이너 경계를 벗어나지 않는다', () => {
    const smallContainer = { width: 220, height: 220 };
    const bubbles = [
      { id: 'a', width: 40, height: 20 },
      { id: 'b', width: 40, height: 20 },
      { id: 'c', width: 40, height: 20 },
    ];

    const result = placeBubbles(bubbles, stickerBounds, smallContainer);

    result.forEach((placed, i) => {
      const size = bubbles[i]!;
      expect(Math.abs(placed.posX) + size.width / 2).toBeLessThanOrEqual(smallContainer.width / 2);
      expect(Math.abs(placed.posY) + size.height / 2).toBeLessThanOrEqual(
        smallContainer.height / 2,
      );
    });
  });

  it('빈 자리가 부족해도 컨테이너 경계 밖으로 나가지 않는다', () => {
    const tightContainer = { width: 220, height: 208 };
    const bubbles = [
      { id: 'a', width: 140, height: 52 },
      { id: 'b', width: 112, height: 32 },
      { id: 'c', width: 89, height: 32 },
      { id: 'd', width: 85, height: 32 },
    ];

    const result = placeBubbles(bubbles, { width: 176, height: 176 }, tightContainer);

    result.forEach((placed, i) => {
      const size = bubbles[i]!;
      expect(Math.abs(placed.posX) + size.width / 2).toBeLessThanOrEqual(tightContainer.width / 2);
      expect(Math.abs(placed.posY) + size.height / 2).toBeLessThanOrEqual(
        tightContainer.height / 2,
      );
    });
  });

  it('같은 입력이면 항상 같은 배치 결과가 나온다', () => {
    const bubbles = [
      { id: 'a', width: 40, height: 20 },
      { id: 'b', width: 30, height: 30 },
    ];

    const first = placeBubbles(bubbles, stickerBounds, container);
    const second = placeBubbles(bubbles, stickerBounds, container);

    expect(first).toEqual(second);
  });

  it('버블이 여러 개면 좌우 개수가 균형 있게 나뉜다', () => {
    const bubbles = [
      { id: 'a', width: 40, height: 20 },
      { id: 'b', width: 40, height: 20 },
      { id: 'c', width: 40, height: 20 },
      { id: 'd', width: 40, height: 20 },
    ];

    const result = placeBubbles(bubbles, stickerBounds, container);
    const rightCount = result.filter((b) => b.posX >= 0).length;
    const leftCount = result.filter((b) => b.posX < 0).length;

    expect(rightCount).toBe(2);
    expect(leftCount).toBe(2);
  });
});

describe('placeBubbles (스티커 모양 격자로 충돌을 판정할 때)', () => {
  const container = { width: 200, height: 200 };
  const stickerBounds = { width: 100, height: 100 };

  // 100x100을 10px 칸으로 나눈 마름모(원형 스티커 단순화) 모양 점유 — 네 모서리는 실제로 투명
  function makeDiamondGrid(): OccupancyGrid {
    const cellSize = 10;
    const cols = 10;
    const rows = 10;
    const occupied = new Array<boolean>(cols * rows).fill(false);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const dx = Math.abs(col - 4.5);
        const dy = Math.abs(row - 4.5);
        if (dx + dy <= 4) occupied[row * cols + col] = true;
      }
    }
    return { cellSize, cols, rows, occupied };
  }

  // overlapsGrid() 재사용 대신 스펙 독립 검증
  function overlapsOccupiedCell(
    rect: { posX: number; posY: number; width: number; height: number },
    grid: OccupancyGrid,
  ): boolean {
    const gridWidth = grid.cols * grid.cellSize;
    const gridHeight = grid.rows * grid.cellSize;
    const rectLeft = rect.posX - rect.width / 2;
    const rectRight = rect.posX + rect.width / 2;
    const rectTop = rect.posY - rect.height / 2;
    const rectBottom = rect.posY + rect.height / 2;

    for (let row = 0; row < grid.rows; row += 1) {
      for (let col = 0; col < grid.cols; col += 1) {
        if (!grid.occupied[row * grid.cols + col]) continue;
        const cellLeft = col * grid.cellSize - gridWidth / 2;
        const cellTop = row * grid.cellSize - gridHeight / 2;
        const overlapsX = rectLeft < cellLeft + grid.cellSize && rectRight > cellLeft;
        const overlapsY = rectTop < cellTop + grid.cellSize && rectBottom > cellTop;
        if (overlapsX && overlapsY) return true;
      }
    }
    return false;
  }

  it('bounding box 모서리처럼 실제로는 투명한 자리도 배치 후보로 쓴다', () => {
    const grid = makeDiamondGrid();
    const bubbleSize = { width: 16, height: 16 };

    const [placed] = placeBubbles([{ id: 'a', ...bubbleSize }], stickerBounds, container, grid);

    expect(overlapsOccupiedCell({ ...placed!, ...bubbleSize }, grid)).toBe(false);
    // 사각형 하나로 막았다면 나올 수 없는, bounding box 모서리 영역
    expect(Math.abs(placed!.posX) < 50 && Math.abs(placed!.posY) < 50).toBe(true);
  });

  it('격자가 없으면 기존처럼 bounding box 사각형으로 겹침을 판정한다', () => {
    const bubbleSize = { width: 16, height: 16 };

    const [placed] = placeBubbles([{ id: 'a', ...bubbleSize }], stickerBounds, container);

    expect(Math.abs(placed!.posX) >= 50 || Math.abs(placed!.posY) >= 50).toBe(true);
  });
});
