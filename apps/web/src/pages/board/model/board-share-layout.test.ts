import { describe, expect, it } from 'vitest';

import type { StickerData } from '../ui/Sticker';

import {
  computeShareCamera,
  computeShareContentBounds,
  SHARE_CONTENT_AREA,
  type ShareBoardContent,
} from './board-share-layout';

function sticker(posX: number, posY: number, scale = 1): StickerData {
  return { posX, posY, scale } as StickerData;
}

function content(overrides: Partial<ShareBoardContent>): ShareBoardContent {
  return { stickers: [], drawings: [], texts: [], ...overrides };
}

describe('computeShareContentBounds', () => {
  it('보드가 비어 있으면 null을 돌려준다', () => {
    expect(computeShareContentBounds(content({}))).toBeNull();
  });

  it('스티커 크기와 아래 뱃지 여유까지 포함한 영역을 계산한다', () => {
    const bounds = computeShareContentBounds(
      content({ stickers: [sticker(0, 0), sticker(400, 200, 0.5)] }),
    );

    expect(bounds).toEqual({ minX: -80, minY: -80, maxX: 440, maxY: 264 });
  });

  it('그림과 텍스트도 영역에 포함한다', () => {
    const bounds = computeShareContentBounds(
      content({
        stickers: [sticker(0, 0)],
        drawings: [
          {
            id: 'd',
            points: [
              { x: -300, y: 0 },
              { x: -200, y: 10 },
            ],
            color: '#fff',
            strokeWidth: 10,
            zIndex: 0,
          },
        ],
      }),
    );

    expect(bounds?.minX).toBe(-305);
  });
});

describe('computeShareCamera', () => {
  const { width, height } = SHARE_CONTENT_AREA;

  it('보드 영역의 가운데를 콘텐츠 영역 가운데에 맞춘다', () => {
    const camera = computeShareCamera({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });

    expect(camera.x + 500 * camera.scale).toBeCloseTo(width / 2);
    expect(camera.y + 500 * camera.scale).toBeCloseTo(height / 2);
  });

  it('넓게 퍼진 보드는 콘텐츠 영역에 다 들어오게 줄인다', () => {
    const camera = computeShareCamera({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });

    expect(camera.scale).toBeCloseTo(height / 1000);
  });

  it('스티커가 적어도 시안 크기보다 크게 키우지 않는다', () => {
    const camera = computeShareCamera({ minX: 0, minY: 0, maxX: 100, maxY: 100 });

    expect(camera.scale).toBeCloseTo(0.528);
  });

  it('너무 넓게 퍼져도 최소 배율 아래로는 줄이지 않는다', () => {
    const camera = computeShareCamera({ minX: 0, minY: 0, maxX: 10000, maxY: 10000 });

    expect(camera.scale).toBeCloseTo(0.2);
  });

  it('화면 영역과 배율 범위를 넘기면 그 영역에 맞춘다', () => {
    const camera = computeShareCamera(
      { minX: 0, minY: 0, maxX: 200, maxY: 100 },
      { width: 400, height: 400 },
      { min: 0.25, max: 1 },
    );

    expect(camera.scale).toBe(1);
    expect(camera.x + 100 * camera.scale).toBeCloseTo(200);
    expect(camera.y + 50 * camera.scale).toBeCloseTo(200);
  });
});
