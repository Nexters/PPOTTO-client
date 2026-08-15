// 좌표계: 스티커 중심이 원점(0,0)
// 제외: 나선형 탐색이 끝까지 실패하는 극단적 케이스(fallback 동작 미검증)
import { describe, expect, it } from 'vitest';

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

  it('같은 random 함수를 쓰면 항상 같은 배치 결과가 나온다', () => {
    const bubbles = [
      { id: 'a', width: 40, height: 20 },
      { id: 'b', width: 30, height: 30 },
    ];
    const random = () => 0.3;

    const first = placeBubbles(bubbles, stickerBounds, container, random);
    const second = placeBubbles(bubbles, stickerBounds, container, random);

    expect(first).toEqual(second);
  });

  it('random 값이 다르면 배치 시작 위치도 달라진다', () => {
    const bubbles = [{ id: 'a', width: 40, height: 20 }];

    const first = placeBubbles(bubbles, stickerBounds, container, () => 0);
    const second = placeBubbles(bubbles, stickerBounds, container, () => 0.5);

    expect(first[0]).not.toEqual(second[0]);
  });
});
