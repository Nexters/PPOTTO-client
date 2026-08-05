/**
 * 동작 범위 (2026-08-04 인터뷰, 2026-08-05 재구성)
 *
 * 보드가 무한 캔버스로 바뀌면서 computeInitialLayout을 고정 프리셋 방식에서
 * 빈 공간 탐색(무작위 후보 + 충돌 검사) 방식으로 교체한다.
 *
 * - 새 스티커는 무작위 후보 + 충돌 검사(rejection sampling)로 배치. 난수 생성 함수를 인자로 받아
 *   테스트 가능하게 한다(기본값 Math.random).
 * - 기존 배치된 스티커는 위치를 그대로 두고(재배치하지 않음), 새 스티커만 그 근처 빈 공간에 배치한다.
 * - 충돌 판정은 실제 이미지 크기가 아니라 고정 반경(플레이스홀더, 85px)으로 한다.
 * - 뭉칠 영역은 기존 스티커 경계 상자의 오른쪽에 고정으로 이어붙인다("여백 넓은 방향" 계산은
 *   무한 캔버스에서 기준이 애매해 단순화함).
 * - badgeOffsetX/Y는 스티커 타입과 무관하게 고정값 하나로 통일한다
 *
 * 스티커 크기 정규화 규칙(가로 고정/가로+세로 고정 등)은 프론트에서 정할 값이라, 충돌 판정용
 * 반경 85px은 일단 임시로 정해두고 써보면서 이상하면 조정한다(외부 확인 대기 아님).
 */
import { describe, expect, it } from 'vitest';

import { computeInitialLayout, needsInitialLayout, toLayoutInput } from './board-layout';

function fakeSticker(overrides: Partial<{ id: string; type: string }> = {}) {
  return { id: 'sticker-1', type: 'IMAGE', ...overrides };
}

/** 정해진 값들을 순서대로 돌려주는 가짜 난수. 겹치지 않는 좌표를 재현 가능하게 만들 때 쓴다. */
function fakeRandomSequence(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length]!;
    index += 1;
    return value;
  };
}

describe('needsInitialLayout', () => {
  it('모든 스티커의 posX/posY가 0이면 true를 반환한다', () => {
    const stickers = [
      { posX: 0, posY: 0 },
      { posX: 0, posY: 0 },
    ];

    expect(needsInitialLayout(stickers)).toBe(true);
  });

  it('스티커 중 하나라도 posX 또는 posY가 0이 아니면 false를 반환한다', () => {
    const stickers = [
      { posX: 0, posY: 0 },
      { posX: 120, posY: 0 },
    ];

    expect(needsInitialLayout(stickers)).toBe(false);
  });

  it('스티커 배열이 비어 있으면 true를 반환한다', () => {
    expect(needsInitialLayout([])).toBe(true);
  });
});

describe('computeInitialLayout', () => {
  const viewport = { width: 1000, height: 1000 };

  it('새 스티커들은 서로 겹치지 않게 배치된다', () => {
    // 스티커당 3번(x, y, rotation) 호출된다. 앞의 두 값(x, y)이 좌표를 정하고,
    // 4개 스티커가 각각 영역의 네 모서리 근처로 퍼지도록 값을 골랐다.
    const random = fakeRandomSequence([0.1, 0.1, 0.5, 0.9, 0.9, 0.5, 0.1, 0.9, 0.5, 0.9, 0.1, 0.5]);
    const newStickers = [
      fakeSticker({ id: 'a' }),
      fakeSticker({ id: 'b' }),
      fakeSticker({ id: 'c' }),
      fakeSticker({ id: 'd' }),
    ];

    const result = computeInitialLayout(newStickers, [], viewport, random);

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

  it('기존 배치된 스티커가 있으면 그 스티커들의 경계 상자 근처에 새 스티커들을 배치한다', () => {
    const existingStickers = [
      { posX: 100, posY: 50, zIndex: 1 },
      { posX: 300, posY: 80, zIndex: 2 },
    ];
    const newStickers = [fakeSticker({ id: 'a' }), fakeSticker({ id: 'b' })];

    const result = computeInitialLayout(newStickers, existingStickers, viewport);

    expect(result.every((sticker) => sticker.posX > 300)).toBe(true);
  });

  it('기존 배치된 스티커가 없으면 뷰포트 중앙 근처에 새 스티커들을 배치한다', () => {
    // 정확한 영역 크기 공식과 결합하지 않고, "중앙 근처"인지만 넉넉한 여유로 확인한다.
    const CENTER_SANITY_MARGIN = 2000;
    const newStickers = [fakeSticker({ id: 'a' }), fakeSticker({ id: 'b' })];

    const result = computeInitialLayout(newStickers, [], viewport);

    result.forEach((sticker) => {
      expect(Math.abs(sticker.posX - viewport.width / 2)).toBeLessThan(CENTER_SANITY_MARGIN);
      expect(Math.abs(sticker.posY - viewport.height / 2)).toBeLessThan(CENTER_SANITY_MARGIN);
    });
  });

  it('배치된 새 스티커들은 서로 가까이 뭉쳐 있다', () => {
    // 정확한 영역 크기 공식과 결합하지 않고, "뭉쳐있는지"만 넉넉한 여유로 확인한다.
    const CLUSTER_SANITY_DISTANCE = 2000;
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

  it('최대 시도 횟수 동안 겹치지 않는 자리를 못 찾으면 겹치더라도 마지막 후보를 사용한다', () => {
    // 항상 같은 값만 반환하는 난수라, 두 번째 스티커부터는 매 시도가 첫 스티커와 같은 좌표로만
    // 나와서 절대 겹침을 피할 수 없다.
    const random = () => 0.5;
    const newStickers = [fakeSticker({ id: 'a' }), fakeSticker({ id: 'b' })];

    const result = computeInitialLayout(newStickers, [], viewport, random);

    expect(result[1]?.posX).toBe(result[0]?.posX);
    expect(result[1]?.posY).toBe(result[0]?.posY);
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

  it('badgeOffsetX/Y는 스티커 타입과 무관하게 고정값으로 배정된다', () => {
    const newStickers = [
      fakeSticker({ id: 'a', type: 'IMAGE' }),
      fakeSticker({ id: 'b', type: 'TEXT' }),
    ];

    const result = computeInitialLayout(newStickers, [], viewport);

    result.forEach((sticker) => {
      expect(sticker.badgeOffsetX).toBe(0);
      expect(sticker.badgeOffsetY).toBe(60);
    });
  });
});

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
