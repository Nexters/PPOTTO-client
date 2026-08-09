/**
 * 동작 범위 (2026-08-09 재구성 — DOM 전환 + 새 인터랙션 스펙 반영)
 *
 * computeResizeScale: 코너 드래그 리사이즈용 옛 함수. SelectBox 제거(Phase 3) 전까지만 유지.
 *
 * applySnap: 회전각을 0/90/180/270°에 ±5° 이내로 들어오면 스냅한다.
 *
 * computeStickerPinchTransform: 두 손가락 제스처로 스티커를 회전+확대+이동을 한 번에 계산한다.
 * 회전·확대 중심은 스티커 자체 중심이 아니라 두 손가락의 중점(제스처 시작 지점) — 손가락을
 * 따라오는 느낌을 위해서다. scale은 0.3~4.0으로 클램프한다.
 * 제외: 최소/최대 클램프의 정확한 정책값 근거는 디자인 확정값을 그대로 따름(재검증 없음)
 *
 * badgeOffset은 직전 커밋된 scale(baseScale) 기준으로 저장돼 있어서, 리사이즈 중 scale이
 * 바뀌면 뱃지가 스티커에서 떨어져 보인다. scaleBadgeOffset은 그 비율만큼 offset도 같이
 * 조정해서 뱃지가 스티커를 따라오게 한다.
 */
import { describe, expect, it } from 'vitest';

import {
  applySnap,
  computeResizeScale,
  computeStickerPinchTransform,
  scaleBadgeOffset,
} from './board-transform';

describe('computeResizeScale', () => {
  const center = { x: 100, y: 100 };

  it('중심에서 멀어지면 그 비율만큼 scale이 커진다', () => {
    const startPoint = { x: 110, y: 100 }; // 중심에서 거리 10
    const currentPoint = { x: 130, y: 100 }; // 중심에서 거리 30 (3배)

    const result = computeResizeScale(center, startPoint, currentPoint, 1);

    expect(result).toBeCloseTo(3);
  });

  it('중심에 가까워지면 그 비율만큼 scale이 작아진다', () => {
    const startPoint = { x: 140, y: 100 }; // 거리 40
    const currentPoint = { x: 110, y: 100 }; // 거리 10 (1/4배)

    const result = computeResizeScale(center, startPoint, currentPoint, 1);

    expect(result).toBeCloseTo(0.25);
  });

  it('거리가 그대로면 scale도 그대로다', () => {
    const startPoint = { x: 110, y: 100 };
    const currentPoint = { x: 100, y: 110 }; // 다른 방향이지만 거리는 같음(10)

    const result = computeResizeScale(center, startPoint, currentPoint, 1);

    expect(result).toBeCloseTo(1);
  });

  it('시작 scale에 비율을 곱해서 반환한다(1이 아닌 경우)', () => {
    const startPoint = { x: 110, y: 100 }; // 거리 10
    const currentPoint = { x: 120, y: 100 }; // 거리 20 (2배)

    const result = computeResizeScale(center, startPoint, currentPoint, 0.8);

    expect(result).toBeCloseTo(1.6);
  });

  it('시작 지점이 중심과 같으면(거리 0) 나눗셈 대신 시작 scale을 그대로 반환한다', () => {
    const startPoint = { x: 100, y: 100 };
    const currentPoint = { x: 150, y: 100 };

    const result = computeResizeScale(center, startPoint, currentPoint, 1.2);

    expect(result).toBe(1.2);
  });
});

describe('applySnap', () => {
  it('정확히 스냅 각도면 그대로 반환한다', () => {
    expect(applySnap(90)).toBe(90);
  });

  it('허용오차(±5°) 안쪽이면 가까운 스냅 각도로 붙는다', () => {
    expect(applySnap(92)).toBe(90);
    expect(applySnap(87)).toBe(90);
  });

  it('허용오차 경계값(정확히 5°)은 스냅된다', () => {
    expect(applySnap(95)).toBe(90);
  });

  it('허용오차를 벗어나면 스냅하지 않는다', () => {
    expect(applySnap(100)).toBe(100);
    expect(applySnap(96)).toBe(96);
  });

  it('360도를 넘거나 음수여도 0도 경계에서 정상적으로 스냅한다', () => {
    expect(applySnap(358)).toBe(0);
    expect(applySnap(-3)).toBe(0);
  });
});

describe('computeStickerPinchTransform', () => {
  it('거리·각도 변화 없이 중심점만 이동하면 그만큼 평행이동한다', () => {
    const base = { x: 100, y: 100, rotation: 0, scale: 1 };
    const start = { centroid: { x: 100, y: 100 }, distance: 50, angle: 0 };
    const current = { centroid: { x: 150, y: 120 }, distance: 50, angle: 0 };

    const result = computeStickerPinchTransform(base, start, current);

    expect(result).toEqual({ x: 150, y: 120, rotation: 0, scale: 1 });
  });

  it('중심점 고정, 거리만 2배가 되면 스티커도 2배 확대되고 중심에서 멀어진다', () => {
    const base = { x: 130, y: 100, rotation: 0, scale: 1 }; // 중심(100,100)에서 30만큼 떨어짐
    const start = { centroid: { x: 100, y: 100 }, distance: 50, angle: 0 };
    const current = { centroid: { x: 100, y: 100 }, distance: 100, angle: 0 };

    const result = computeStickerPinchTransform(base, start, current);

    expect(result.scale).toBe(2);
    expect(result.x).toBeCloseTo(160); // 중심에서 거리도 2배(30 -> 60)로 벌어짐
    expect(result.y).toBeCloseTo(100);
  });

  it('중심점·거리 고정, 각도만 바뀌면 그 각도만큼 중심점 기준으로 회전한다', () => {
    const base = { x: 130, y: 100, rotation: 0, scale: 1 };
    const start = { centroid: { x: 100, y: 100 }, distance: 50, angle: 0 };
    const current = { centroid: { x: 100, y: 100 }, distance: 50, angle: 45 };

    const result = computeStickerPinchTransform(base, start, current);

    expect(result.rotation).toBe(45);
    expect(result.x).toBeCloseTo(121.213, 2);
    expect(result.y).toBeCloseTo(121.213, 2);
  });

  it('각도 변화가 스냅 허용오차 안쪽이면 회전값도 스냅된다', () => {
    const base = { x: 100, y: 100, rotation: 0, scale: 1 };
    const start = { centroid: { x: 0, y: 0 }, distance: 10, angle: 0 };
    const current = { centroid: { x: 0, y: 0 }, distance: 10, angle: 92 };

    const result = computeStickerPinchTransform(base, start, current);

    expect(result.rotation).toBe(90);
  });

  it('배율이 상한(4배)을 넘으면 상한으로 고정된다', () => {
    const base = { x: 100, y: 100, rotation: 0, scale: 3.5 };
    const start = { centroid: { x: 0, y: 0 }, distance: 10, angle: 0 };
    const current = { centroid: { x: 0, y: 0 }, distance: 1000, angle: 0 };

    const result = computeStickerPinchTransform(base, start, current);

    expect(result.scale).toBe(4);
  });

  it('배율이 하한(0.3배) 밑으로 내려가면 하한으로 고정된다', () => {
    const base = { x: 100, y: 100, rotation: 0, scale: 0.5 };
    const start = { centroid: { x: 0, y: 0 }, distance: 100, angle: 0 };
    const current = { centroid: { x: 0, y: 0 }, distance: 1, angle: 0 };

    const result = computeStickerPinchTransform(base, start, current);

    expect(result.scale).toBe(0.3);
  });

  it('시작 거리가 0이면(손가락이 겹친 상태) 나눗셈 대신 base를 그대로 반환한다', () => {
    const base = { x: 5, y: 5, rotation: 10, scale: 2 };
    const start = { centroid: { x: 0, y: 0 }, distance: 0, angle: 0 };
    const current = { centroid: { x: 100, y: 100 }, distance: 50, angle: 90 };

    const result = computeStickerPinchTransform(base, start, current);

    expect(result).toEqual(base);
  });
});

describe('scaleBadgeOffset', () => {
  it('현재 scale이 baseScale과 같으면 offset이 그대로 유지된다', () => {
    const result = scaleBadgeOffset({ x: 20, y: 10 }, 1.5, 1.5);

    expect(result).toEqual({ x: 20, y: 10 });
  });

  it('현재 scale이 baseScale의 절반이면 offset도 절반이 된다', () => {
    const result = scaleBadgeOffset({ x: 20, y: 10 }, 0.5, 1);

    expect(result).toEqual({ x: 10, y: 5 });
  });

  it('현재 scale이 baseScale의 2배면 offset도 2배가 된다', () => {
    const result = scaleBadgeOffset({ x: 20, y: 10 }, 2, 1);

    expect(result).toEqual({ x: 40, y: 20 });
  });

  it('baseScale이 0이면 나눗셈 대신 offset을 그대로 반환한다', () => {
    const result = scaleBadgeOffset({ x: 20, y: 10 }, 1, 0);

    expect(result).toEqual({ x: 20, y: 10 });
  });
});
