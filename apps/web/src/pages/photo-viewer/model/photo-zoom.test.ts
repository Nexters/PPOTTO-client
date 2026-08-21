import { describe, expect, test } from 'vitest';

import { calculatePinchTransform, distanceBetween, midpointBetween } from './photo-zoom';

describe('photo zoom geometry', () => {
  test('두 포인터의 거리와 중심점을 계산한다', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpointBetween({ x: 10, y: 20 }, { x: 30, y: 60 })).toEqual({ x: 20, y: 40 });
  });

  test('핀치 중심을 유지하며 사진을 확대한다', () => {
    expect(
      calculatePinchTransform({
        startDistance: 100,
        startScale: 1,
        startFocalPoint: { x: 150, y: 100 },
        currentDistance: 200,
        currentCenter: { x: 200, y: 100 },
        minScale: 1,
        maxScale: 3,
      }),
    ).toEqual({ scale: 2, translateX: -100, translateY: -100 });
  });

  test('최대 배율을 제한한다', () => {
    expect(
      calculatePinchTransform({
        startDistance: 100,
        startScale: 1,
        startFocalPoint: { x: 100, y: 100 },
        currentDistance: 500,
        currentCenter: { x: 100, y: 100 },
        minScale: 1,
        maxScale: 3,
      }).scale,
    ).toBe(3);
  });

  test('최소 배율에서는 원래 위치로 복귀한다', () => {
    expect(
      calculatePinchTransform({
        startDistance: 100,
        startScale: 2,
        startFocalPoint: { x: 100, y: 100 },
        currentDistance: 10,
        currentCenter: { x: 200, y: 200 },
        minScale: 1,
        maxScale: 3,
      }),
    ).toEqual({ scale: 1, translateX: 0, translateY: 0 });
  });
});
