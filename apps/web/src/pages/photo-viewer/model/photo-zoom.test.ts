import { describe, expect, test } from 'vitest';

import {
  applyZoomBoundaryResistance,
  calculatePointZoomTransform,
  calculatePinchTransform,
  constrainZoomTransform,
  distanceBetween,
  midpointBetween,
  resolveZoomEdgeDirection,
  shouldNavigateZoomEdge,
} from './photo-zoom';

describe('photo zoom geometry', () => {
  test('선택한 지점을 유지하며 지정 배율로 확대한다', () => {
    expect(
      calculatePointZoomTransform(
        { scale: 1, translateX: 0, translateY: 0 },
        { x: 100, y: 80 },
        2.5,
      ),
    ).toEqual({ scale: 2.5, translateX: -150, translateY: -120 });
  });

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

describe('constrainZoomTransform', () => {
  test('확대된 사진이 뷰포트 오른쪽 밖으로 지나치게 이동하지 않도록 제한한다', () => {
    expect(
      constrainZoomTransform(
        { scale: 2, translateX: 100, translateY: 0 },
        { left: 0, top: 100, width: 300, height: 200 },
        { left: 0, top: 0, width: 300, height: 400 },
      ),
    ).toEqual({ scale: 2, translateX: 0, translateY: -200 });
  });

  test('확대 후에도 뷰포트보다 작은 축은 가운데에 고정한다', () => {
    expect(
      constrainZoomTransform(
        { scale: 1.5, translateX: -50, translateY: 100 },
        { left: 100, top: 150, width: 100, height: 100 },
        { left: 0, top: 0, width: 300, height: 400 },
      ),
    ).toEqual({ scale: 1.5, translateX: -75, translateY: -100 });
  });
});

describe('applyZoomBoundaryResistance', () => {
  test('경계를 넘은 이동량의 일부만 반영한다', () => {
    expect(
      applyZoomBoundaryResistance(
        { scale: 2, translateX: 100, translateY: -200 },
        { left: 0, top: 100, width: 300, height: 200 },
        { left: 0, top: 0, width: 300, height: 400 },
        0.2,
      ),
    ).toEqual({ scale: 2, translateX: 20, translateY: -200 });
  });
});

describe('zoom edge navigation', () => {
  const image = { left: 0, top: 100, width: 300, height: 200 };
  const viewport = { left: 0, top: 0, width: 300, height: 400 };

  test('오른쪽 끝에서 바깥쪽으로 이동하면 다음 사진 방향을 반환한다', () => {
    expect(
      resolveZoomEdgeDirection(
        { scale: 2, translateX: -300, translateY: -200 },
        image,
        viewport,
        -20,
        2,
      ),
    ).toBe('next');
  });

  test('왼쪽 끝에서 바깥쪽으로 이동하면 이전 사진 방향을 반환한다', () => {
    expect(
      resolveZoomEdgeDirection(
        { scale: 2, translateX: 0, translateY: -200 },
        image,
        viewport,
        20,
        2,
      ),
    ).toBe('previous');
  });

  test('경계가 아니거나 세로 이동이면 사진 전환 방향을 반환하지 않는다', () => {
    expect(
      resolveZoomEdgeDirection(
        { scale: 2, translateX: -100, translateY: -200 },
        image,
        viewport,
        -20,
        2,
      ),
    ).toBeNull();
    expect(
      resolveZoomEdgeDirection(
        { scale: 2, translateX: -300, translateY: -200 },
        image,
        viewport,
        -10,
        20,
      ),
    ).toBeNull();
  });

  test('충분한 거리 또는 속도에서 사진 전환을 확정한다', () => {
    expect(shouldNavigateZoomEdge(50, 300, 0.1)).toBe(true);
    expect(shouldNavigateZoomEdge(10, 300, 0.6)).toBe(true);
    expect(shouldNavigateZoomEdge(20, 300, 0.2)).toBe(false);
  });
});
