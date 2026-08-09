import { describe, expect, it } from 'vitest';

import { clamp, rotatePoint } from './geometry';

describe('clamp', () => {
  it('범위 안의 값은 그대로 반환한다', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('최솟값보다 작으면 최솟값을 반환한다', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it('최댓값보다 크면 최댓값을 반환한다', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('rotatePoint', () => {
  it('0도 회전이면 그대로다', () => {
    const result = rotatePoint({ x: 3, y: 4 }, 0);

    expect(result.x).toBeCloseTo(3);
    expect(result.y).toBeCloseTo(4);
  });

  it('90도 회전하면 x축 위의 점이 y축으로 옮겨간다', () => {
    const result = rotatePoint({ x: 1, y: 0 }, 90);

    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(1);
  });

  it('180도 회전하면 점이 원점 반대편으로 옮겨간다', () => {
    const result = rotatePoint({ x: 1, y: 0 }, 180);

    expect(result.x).toBeCloseTo(-1);
    expect(result.y).toBeCloseTo(0);
  });

  it('회전해도 원점으로부터의 거리는 유지된다', () => {
    const result = rotatePoint({ x: 3, y: 4 }, 37);

    expect(Math.hypot(result.x, result.y)).toBeCloseTo(5);
  });
});
