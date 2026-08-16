/**
 * 동작 범위 (2026-08-12 재구성 — 빈 공간 자동 배치 복원)
 *
 * board-layout.ts는 저장 API 요청 바디 변환(toLayoutInput), 스티커 선택 시 zIndex를
 * 맨 위로 올리는 계산(computeBringToFrontZIndex), 그리고 새로 생성된(좌표가 없는) 스티커를
 * 빈 공간에 자동 배치하는 계산(needsInitialLayout, computeInitialLayout)을 담당한다.
 *
 * needsInitialLayout: posX/posY/zIndex 중 하나라도 null이거나 없으면(API 계약상 "아직 클라이언트가
 * 배치를 정하지 않음") 배치가 필요하다고 본다.
 *
 * computeInitialLayout: 기준점에서 가까운 곳부터 나선형(반지름을 늘려가며 한 바퀴씩)으로 훑어
 * "안 겹치는 첫 자리"를 찾는다 — 빈자리가 있는 한 반드시 찾고, 가장 가까운 자리부터 보니
 * 자연스럽게 뭉친 결과가 나온다.
 *
 * - 첫 스티커는 시작 기준점(첫 배치면 뷰포트 중앙, 기존 스티커 있으면 그 오른쪽) 근처에, 그다음
 *   부터는 "지금까지 놓인 새 스티커들의 중심점"을 기준점 삼아 이어붙여서 무리가 계속 뭉쳐있게
 *   한다. 난수 생성 함수를 인자로 받아 테스트 가능하게 한다(기본값 Math.random).
 * - 기존 배치된 스티커는 위치를 그대로 두고(재배치하지 않음), 새 스티커만 그 근처 빈 공간에 배치한다.
 * - 충돌 판정은 실제 이미지 크기가 아니라 고정 반경(플레이스홀더, 85px)으로 한다.
 * - 기존 스티커가 있을 땐 각도를 오른쪽 반원(-90~90도)으로 제한해, 새 무리가 기존 스티커 쪽으로
 *   다시 넘어가지 않게 한다. 시작 각도에 매번 한 스텝 폭만큼 무작위 지터를 줘서, 배치마다 항상
 *   똑같은 모양으로 나열되지 않게 한다.
 * - badgeOffsetX/Y는 스티커 타입과 무관하게 위/아래 x 왼쪽/가운데/오른쪽 6방향 프리셋 중 하나를
 *   난수로 골라 배정한다(스티커를 너무 가리지 않으면서도 위치에 변화를 줌)
 * - 나선형 탐색의 세로 반지름에 뷰포트 세로/가로 비율을 (완화해서) 곱해서, 뷰포트가 세로로 길수록
 *   무리도 세로로 더 퍼지게 한다(안 그러면 원형으로만 퍼져서 가로 폭에 막혀 위아래가 여백으로 남음).
 *   비율을 그대로 다 반영하면 반대로 거의 세로 한 줄처럼 늘어서길래 절반만 반영한다
 *
 * 제외: 나선형 최대 탐색 반경(4500px) 내내 빈자리를 못 찾는 극단적 케이스 — 이론상 fallback으로
 *   마지막 후보를 그대로 반환하지만, 손으로 구성하기 힘들 만큼 밀집된 상황에서만 발생해 실질적으로
 *   테스트하지 않는다.
 */
import { describe, expect, it } from 'vitest';

import {
  computeBringToFrontZIndex,
  computeInitialLayout,
  computeTopZIndex,
  needsInitialLayout,
  toLayoutInput,
} from './board-layout';

function fakeSticker(overrides: Partial<{ id: string; type: string }> = {}) {
  return { id: 'sticker-1', type: 'IMAGE', ...overrides };
}

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

describe('computeTopZIndex', () => {
  it('목록이 비어있으면 0을 반환한다', () => {
    expect(computeTopZIndex([])).toBe(0);
  });

  it('가장 큰 zIndex보다 1 큰 값을 반환한다', () => {
    const items = [{ zIndex: 1 }, { zIndex: 5 }, { zIndex: 3 }];

    expect(computeTopZIndex(items)).toBe(6);
  });

  it('스티커와 그림처럼 서로 다른 종류의 항목을 섞어도 같은 숫자 공간으로 취급한다', () => {
    const stickers = [{ zIndex: 2 }];
    const drawings = [{ zIndex: 7 }];

    expect(computeTopZIndex([...stickers, ...drawings])).toBe(8);
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

  it('필드 자체가 없어도(undefined) true를 반환한다', () => {
    expect(needsInitialLayout({})).toBe(true);
  });
});

describe('computeInitialLayout', () => {
  const viewport = { width: 1000, height: 1000 };

  it('기준점에 이미 스티커가 있으면 최소 간격을 처음 넘어서는 가장 가까운 자리를 찾는다', () => {
    const random = () => 0;
    const newStickers = [fakeSticker({ id: 'a' }), fakeSticker({ id: 'b' })];

    const result = computeInitialLayout(newStickers, [], viewport, random);

    expect(result[0]).toMatchObject({ posX: 515, posY: 500 });
    expect(result[1]).toMatchObject({ posX: 695, posY: 500 });
  });

  it('새 스티커들은 서로 최소 간격보다 가깝지 않게 배치된다', () => {
    const newStickers = [
      fakeSticker({ id: 'a' }),
      fakeSticker({ id: 'b' }),
      fakeSticker({ id: 'c' }),
      fakeSticker({ id: 'd' }),
      fakeSticker({ id: 'e' }),
      fakeSticker({ id: 'f' }),
    ];

    const result = computeInitialLayout(newStickers, [], viewport);

    for (let i = 0; i < result.length; i += 1) {
      for (let j = i + 1; j < result.length; j += 1) {
        const distance = Math.hypot(
          result[i]!.posX - result[j]!.posX,
          result[i]!.posY - result[j]!.posY,
        );
        expect(distance).toBeGreaterThanOrEqual(170);
      }
    }
  });

  it('기존 배치된 스티커가 있으면 그 오른쪽에 새 스티커들을 배치한다', () => {
    const existingStickers = [
      { posX: 100, posY: 50, zIndex: 1 },
      { posX: 300, posY: 80, zIndex: 2 },
    ];
    const newStickers = [fakeSticker({ id: 'a' }), fakeSticker({ id: 'b' })];
    const random = () => 0;

    const result = computeInitialLayout(newStickers, existingStickers, viewport, random);

    expect(result[0]).toMatchObject({ posX: 470, posY: 35 });
    expect(result[1]).toMatchObject({ posX: 470, posY: -145 });
  });

  it('기존 배치된 스티커가 없으면 뷰포트 중앙 근처에 새 스티커들을 배치한다', () => {
    const CENTER_SANITY_MARGIN = 400;
    const newStickers = [fakeSticker({ id: 'a' }), fakeSticker({ id: 'b' })];

    const result = computeInitialLayout(newStickers, [], viewport);

    result.forEach((sticker) => {
      expect(Math.abs(sticker.posX - viewport.width / 2)).toBeLessThan(CENTER_SANITY_MARGIN);
      expect(Math.abs(sticker.posY - viewport.height / 2)).toBeLessThan(CENTER_SANITY_MARGIN);
    });
  });

  it('배치된 새 스티커들은 서로 가까이 뭉쳐 있다', () => {
    const CLUSTER_SANITY_DISTANCE = 450;
    const newStickers = [
      fakeSticker({ id: 'a' }),
      fakeSticker({ id: 'b' }),
      fakeSticker({ id: 'c' }),
      fakeSticker({ id: 'd' }),
    ];

    const result = computeInitialLayout(newStickers, [], viewport);

    for (let i = 0; i < result.length; i += 1) {
      for (let j = i + 1; j < result.length; j += 1) {
        const distance = Math.hypot(
          result[i]!.posX - result[j]!.posX,
          result[i]!.posY - result[j]!.posY,
        );
        expect(distance).toBeLessThan(CLUSTER_SANITY_DISTANCE);
      }
    }
  });

  it('회전 각도는 -15도에서 15도 사이로 무작위 배정된다', () => {
    const newStickers = [
      fakeSticker({ id: 'a' }),
      fakeSticker({ id: 'b' }),
      fakeSticker({ id: 'c' }),
    ];

    const result = computeInitialLayout(newStickers, [], viewport);

    result.forEach((sticker) => {
      expect(sticker.rotation).toBeGreaterThanOrEqual(-15);
      expect(sticker.rotation).toBeLessThanOrEqual(15);
    });
  });

  it('zIndex는 기존 스티커의 최댓값보다 크게 이어서 매겨진다', () => {
    const existingStickers = [
      { posX: 0, posY: 0, zIndex: 3 },
      { posX: 500, posY: 500, zIndex: 7 },
    ];
    const newStickers = [fakeSticker({ id: 'a' }), fakeSticker({ id: 'b' })];

    const result = computeInitialLayout(newStickers, existingStickers, viewport);

    expect(result.map((sticker) => sticker.zIndex)).toEqual([8, 9]);
  });

  it('badgeOffsetX/Y는 스티커 타입과 무관하게 위/아래 x 왼쪽/가운데/오른쪽 6방향 중 하나로 배정된다', () => {
    const newStickers = [
      fakeSticker({ id: 'a', type: 'IMAGE' }),
      fakeSticker({ id: 'b', type: 'TEXT' }),
    ];
    const presets = [
      { x: 0, y: 60 },
      { x: -45, y: 55 },
      { x: 45, y: 55 },
      { x: 0, y: -60 },
      { x: -45, y: -55 },
      { x: 45, y: -55 },
    ];

    const result = computeInitialLayout(newStickers, [], viewport);

    result.forEach((sticker) => {
      expect(presets).toContainEqual({ x: sticker.badgeOffsetX, y: sticker.badgeOffsetY });
    });
  });

  it('random() 값에 따라 badgeOffsetX/Y로 골라지는 방향이 달라진다', () => {
    const newStickers = [fakeSticker({ id: 'a' })];

    const first = computeInitialLayout(newStickers, [], viewport, () => 0);
    const last = computeInitialLayout(newStickers, [], viewport, () => 5 / 6);

    expect(first[0]).toMatchObject({ badgeOffsetX: 0, badgeOffsetY: 60 });
    expect(last[0]).toMatchObject({ badgeOffsetX: 45, badgeOffsetY: -55 });
  });

  it('뷰포트가 세로로 길수록 세로 방향 간격이 (완화된 비율만큼) 더 벌어진다', () => {
    const tallViewport = { width: 500, height: 1000 };
    const random = () => 0.25;
    const newStickers = [fakeSticker({ id: 'a' })];

    const result = computeInitialLayout(newStickers, [], tallViewport, random);

    expect(result[0]).toMatchObject({ posX: 250, posY: 522.5 });
  });
});
