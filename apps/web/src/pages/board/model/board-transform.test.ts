/**
 * 동작 범위 (2026-08-07 인터뷰)
 *
 * 선택된 스티커의 모서리 핸들을 드래그해서 크기를 조정한다. 중심점에서 핸들까지의 거리가
 * 회전과 무관하게 유지된다는 성질을 이용해, 시작 거리 대비 지금 거리의 비율만큼 scale에 곱한다.
 *
 * 제외: 회전 — 별도 이슈로 분리(코너 드래그가 리사이즈만 담당, 각도 추적·모드 전환 없음)
 * 제외: 최소/최대 크기 제한 — 기획 미정
 *
 * badgeOffset은 직전 커밋된 scale(baseScale) 기준으로 저장돼 있어서, 리사이즈 중 scale이
 * 바뀌면 뱃지가 스티커에서 떨어져 보인다. scaleBadgeOffset은 그 비율만큼 offset도 같이
 * 조정해서 뱃지가 스티커를 따라오게 한다.
 */
import { describe, expect, it } from 'vitest';

import { computeResizeScale, scaleBadgeOffset } from './board-transform';

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
