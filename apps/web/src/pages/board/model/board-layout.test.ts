/**
 * 동작 범위 (2026-08-07 재구성)
 *
 * board-layout.ts는 저장 API 요청 바디 변환(toLayoutInput)과, 스티커 선택 시
 * zIndex를 맨 위로 올리는 계산(computeBringToFrontZIndex)을 담당한다.
 *
 * 제외: 새로 배치된 스티커로 카메라 포커스 이동 — 별도 이슈로 분리
 */
import { describe, expect, it } from 'vitest';

import { computeBringToFrontZIndex, toLayoutInput } from './board-layout';

describe('toLayoutInput', () => {
  it('badgeRotation을 rotation의 음수값으로 계산해 반환한다', () => {
    const stickers = [
      {
        id: 'a',
        posX: 10,
        posY: 20,
        rotation: 12,
        scale: 1,
        zIndex: 1,
        badgeOffsetX: 5,
        badgeOffsetY: -10,
      },
    ];

    const result = toLayoutInput(stickers);

    expect(result.stickers?.[0]?.badgeRotation).toBe(-12);
  });

  it('저장 API 스펙 필드만 담아 반환한다', () => {
    const stickers = [
      {
        id: 'a',
        posX: 10,
        posY: 20,
        rotation: 12,
        scale: 1,
        zIndex: 1,
        badgeOffsetX: 5,
        badgeOffsetY: -10,
      },
    ];

    const result = toLayoutInput(stickers);

    expect(result.stickers?.[0]).toEqual({
      id: 'a',
      posX: 10,
      posY: 20,
      rotation: 12,
      scale: 1,
      zIndex: 1,
      badgeOffsetX: 5,
      badgeOffsetY: -10,
      badgeRotation: -12,
    });
  });
});

describe('computeBringToFrontZIndex', () => {
  it('선택한 스티커가 맨 위가 아니면 가장 큰 zIndex보다 1 큰 값을 반환한다', () => {
    const stickers = [
      { id: 'a', zIndex: 1 },
      { id: 'b', zIndex: 3 },
      { id: 'c', zIndex: 2 },
    ];

    const result = computeBringToFrontZIndex(stickers, 'a');

    expect(result).toBe(4);
  });

  it('선택한 스티커가 이미 맨 위면 null을 반환한다', () => {
    const stickers = [
      { id: 'a', zIndex: 1 },
      { id: 'b', zIndex: 3 },
    ];

    const result = computeBringToFrontZIndex(stickers, 'b');

    expect(result).toBeNull();
  });

  it('목록에 없는 id를 선택하면 null을 반환한다', () => {
    const stickers = [{ id: 'a', zIndex: 1 }];

    const result = computeBringToFrontZIndex(stickers, 'z');

    expect(result).toBeNull();
  });
});
