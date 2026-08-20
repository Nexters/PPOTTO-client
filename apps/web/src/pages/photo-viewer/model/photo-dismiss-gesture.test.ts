import { describe, expect, test } from 'vitest';

import {
  calculateReleaseVelocity,
  clampDragY,
  dragYToScale,
  resolveDragAxis,
  shouldDismiss,
} from './photo-dismiss-gesture';

describe('resolveDragAxis', () => {
  test('축 판정 거리보다 적게 움직이면 아직 방향을 정하지 않는다', () => {
    expect(resolveDragAxis(5, 5)).toBe('pending');
  });

  test('가로 이동이 세로보다 뚜렷하면 horizontal로 고정된다', () => {
    expect(resolveDragAxis(20, 5)).toBe('horizontal');
  });

  test('세로 이동이 가로보다 뚜렷하면 vertical로 고정된다', () => {
    expect(resolveDragAxis(5, 20)).toBe('vertical');
  });

  test('축 판정 후에는 더 많이 움직인 방향으로 즉시 고정된다', () => {
    expect(resolveDragAxis(15, 14)).toBe('horizontal');
    expect(resolveDragAxis(14, 15)).toBe('vertical');
  });
});

describe('calculateReleaseVelocity', () => {
  test('최근 이동 샘플 구간의 평균 속도를 계산한다', () => {
    expect(
      calculateReleaseVelocity(
        [
          { y: 100, time: 0 },
          { y: 130, time: 30 },
          { y: 180, time: 80 },
        ],
        90,
        80,
      ),
    ).toBe(1);
  });

  test('손을 멈춘 뒤 늦게 놓으면 이전의 빠른 움직임을 플릭으로 보지 않는다', () => {
    expect(
      calculateReleaseVelocity(
        [
          { y: 100, time: 0 },
          { y: 180, time: 50 },
        ],
        200,
        80,
      ),
    ).toBe(0);
  });
});

describe('clampDragY', () => {
  test('아래로 당기면 그대로 반영된다', () => {
    expect(clampDragY(100)).toBe(100);
  });

  test('위로 당기면 사진을 움직이지 않는다', () => {
    expect(clampDragY(-40)).toBe(0);
  });
});

describe('shouldDismiss', () => {
  test('화면 높이 대비 충분히 이동하면 닫는다', () => {
    expect(shouldDismiss(150, 800, 0)).toBe(true);
  });

  test('이동량이 적어도 속도가 빠르면 닫는다', () => {
    expect(shouldDismiss(20, 800, 1)).toBe(true);
  });

  test('이동량도 적고 속도도 느리면 닫지 않는다', () => {
    expect(shouldDismiss(20, 800, 0.1)).toBe(false);
  });
});

describe('dragYToScale', () => {
  test('안 당겼으면 원래 크기를 유지한다', () => {
    expect(dragYToScale(0)).toBe(1);
  });

  test('충분히 당기면 최대로 축소된 크기에서 더 줄지 않는다', () => {
    expect(dragYToScale(1000)).toBeCloseTo(0.94);
  });
});
