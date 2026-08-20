import { describe, expect, it } from 'vitest';

import {
  computeBringToFrontZIndex,
  computeTopZIndex,
  needsInitialLayout,
  toLayoutInput,
} from './board-layout';

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

    expect(computeBringToFrontZIndex(stickers, 'a')).toBe(4);
  });

  it('선택한 스티커가 이미 맨 위면 null을 반환한다', () => {
    const stickers = [
      { id: 'a', zIndex: 1 },
      { id: 'b', zIndex: 3 },
    ];

    expect(computeBringToFrontZIndex(stickers, 'b')).toBeNull();
  });

  it('목록에 없는 id를 선택하면 null을 반환한다', () => {
    expect(computeBringToFrontZIndex([{ id: 'a', zIndex: 1 }], 'z')).toBeNull();
  });
});

describe('computeTopZIndex', () => {
  it('목록이 비어있으면 0을 반환한다', () => {
    expect(computeTopZIndex([])).toBe(0);
  });

  it('가장 큰 zIndex보다 1 큰 값을 반환한다', () => {
    expect(computeTopZIndex([{ zIndex: 1 }, { zIndex: 5 }, { zIndex: 3 }])).toBe(6);
  });

  it('서로 다른 종류의 항목도 같은 숫자 공간으로 취급한다', () => {
    expect(computeTopZIndex([{ zIndex: 2 }, { zIndex: 7 }])).toBe(8);
  });
});

describe('needsInitialLayout', () => {
  it('posX/posY/zIndex가 모두 있으면 false를 반환한다', () => {
    expect(needsInitialLayout({ posX: 10, posY: 20, zIndex: 1 })).toBe(false);
  });

  it('posX가 null이면 true를 반환한다', () => {
    expect(needsInitialLayout({ posX: null, posY: 20, zIndex: 1 })).toBe(true);
  });

  it('posY가 null이면 true를 반환한다', () => {
    expect(needsInitialLayout({ posX: 10, posY: null, zIndex: 1 })).toBe(true);
  });

  it('zIndex가 null이면 true를 반환한다', () => {
    expect(needsInitialLayout({ posX: 10, posY: 20, zIndex: null })).toBe(true);
  });

  it('필드 자체가 없어도 true를 반환한다', () => {
    expect(needsInitialLayout({})).toBe(true);
  });
});
