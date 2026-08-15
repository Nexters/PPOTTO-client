import { describe, expect, it } from 'vitest';

import { computeContentBounds, computeOccupancyGrid } from './get-sticker-content-bounds';

function makePixels(
  width: number,
  height: number,
  opaquePoints: [x: number, y: number][],
  alpha = 255,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of opaquePoints) {
    pixels[(y * width + x) * 4 + 3] = alpha;
  }
  return pixels;
}

describe('computeContentBounds', () => {
  it('불투명 픽셀들을 감싸는 최소 bounding box를 반환한다', () => {
    const pixels = makePixels(5, 5, [
      [1, 1],
      [3, 1],
      [1, 3],
      [3, 3],
    ]);

    const result = computeContentBounds(pixels, 5, 5);

    expect(result).toEqual({ x: 1, y: 1, width: 3, height: 3 });
  });

  it('전부 투명하면 null을 반환한다', () => {
    const pixels = makePixels(4, 4, []);

    expect(computeContentBounds(pixels, 4, 4)).toBeNull();
  });

  it('알파값이 임계값 이하인 픽셀은 무시한다', () => {
    const pixels = makePixels(4, 4, [[2, 2]], 10);

    expect(computeContentBounds(pixels, 4, 4)).toBeNull();
  });

  it('임계값을 넘는 알파값은 포함한다', () => {
    const pixels = makePixels(4, 4, [[2, 2]], 11);

    expect(computeContentBounds(pixels, 4, 4)).toEqual({ x: 2, y: 2, width: 1, height: 1 });
  });

  it('이미지 전체가 불투명하면 전체 크기를 반환한다', () => {
    const points: [number, number][] = [];
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) points.push([x, y]);
    }
    const pixels = makePixels(3, 3, points);

    expect(computeContentBounds(pixels, 3, 3)).toEqual({ x: 0, y: 0, width: 3, height: 3 });
  });

  it('내용이 한쪽으로 치우쳐 있으면 그 위치를 그대로 반영한다', () => {
    const pixels = makePixels(10, 4, [
      [8, 1],
      [9, 1],
      [8, 2],
      [9, 2],
    ]);

    expect(computeContentBounds(pixels, 10, 4)).toEqual({ x: 8, y: 1, width: 2, height: 2 });
  });
});

describe('computeOccupancyGrid', () => {
  it('불투명 픽셀이 있는 칸만 점유로 표시한다', () => {
    // 4x4를 2px 칸으로 나눈 2x2 격자, 오른쪽 아래 칸에만 불투명 픽셀
    const pixels = makePixels(4, 4, [[3, 3]]);

    const grid = computeOccupancyGrid(pixels, 4, 4, 2);

    expect(grid).toEqual({ cellSize: 2, cols: 2, rows: 2, occupied: [false, false, false, true] });
  });

  it('원형처럼 가운데만 채워진 모양이면 모서리 칸은 비어 있다고 판단한다', () => {
    // 6x6을 2px 칸으로 나눈 3x3 격자, 가운데 칸(2~3,2~3)에만 불투명 픽셀
    const points: [number, number][] = [
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ];
    const pixels = makePixels(6, 6, points);

    const grid = computeOccupancyGrid(pixels, 6, 6, 2);

    // 네 모서리 칸
    expect(grid.occupied[0 * 3 + 0]).toBe(false);
    expect(grid.occupied[0 * 3 + 2]).toBe(false);
    expect(grid.occupied[2 * 3 + 0]).toBe(false);
    expect(grid.occupied[2 * 3 + 2]).toBe(false);
    expect(grid.occupied[1 * 3 + 1]).toBe(true);
  });

  it('전부 투명하면 모든 칸이 비어 있다', () => {
    const pixels = makePixels(4, 4, []);

    const grid = computeOccupancyGrid(pixels, 4, 4, 2);

    expect(grid.occupied.every((cell) => cell === false)).toBe(true);
  });
});
