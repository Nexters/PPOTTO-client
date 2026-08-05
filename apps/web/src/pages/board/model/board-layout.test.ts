/**
 * 동작 범위 (2026-08-04 인터뷰, 2026-08-05 나선형 탐색으로 재구성)
 *
 * 보드가 무한 캔버스로 바뀌면서 computeInitialLayout을 고정 프리셋 방식에서 빈 공간 탐색
 * 방식으로 교체한다. 기준점에서 가까운 곳부터 나선형(반지름을 늘려가며 한 바퀴씩)으로 훑어
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
 * - badgeOffsetX/Y는 스티커 타입과 무관하게 고정값 하나로 통일한다
 *
 * 제외: 나선형 최대 탐색 반경(4500px) 내내 빈자리를 못 찾는 극단적 케이스 — 이론상 fallback으로
 *   마지막 후보를 그대로 반환하지만, 손으로 구성하기 힘들 만큼 밀집된 상황에서만 발생해 실질적으로
 *   테스트하지 않는다.
 * 제외: 시작 각도 지터 계산에 아주 드물게(시뮬레이션 6만 회 중 34회, 약 0.06%) 오차가 있어 새
 *   스티커가 기존 스티커보다 살짝 왼쪽에 놓일 수 있음 — 사용자가 스티커를 직접 옮길 수 있어
 *   감수하기로 함(2026-08-05).
 *
 * 스티커 크기 정규화 규칙(가로 고정/가로+세로 고정 등)은 프론트에서 정할 값이라, 충돌 판정용
 * 반경 85px은 일단 임시로 정해두고 써보면서 이상하면 조정한다(외부 확인 대기 아님).
 */
import { describe, expect, it } from 'vitest';

import { computeInitialLayout, needsInitialLayout, toLayoutInput } from './board-layout';

function fakeSticker(overrides: Partial<{ id: string; type: string }> = {}) {
  return { id: 'sticker-1', type: 'IMAGE', ...overrides };
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

  it('기준점에 이미 스티커가 있으면 최소 간격을 처음 넘어서는 가장 가까운 자리를 찾는다', () => {
    // random을 0으로 고정하면 시작 각도 지터가 없어진다. 첫 스티커는 뷰포트 중앙에서 15px
    // 떨어진 곳에 바로 놓이고(아직 아무 데도 안 겹치니 첫 시도에 성공), 두 번째 스티커는 그
    // 자리(=새 기준점)와 겹치므로 나선형으로 반지름을 늘려가다 최소 간격(170px)을 처음 넘는
    // 180px 지점(15px * 12바퀴)에서 멈춘다 — 직접 계산해 확인함.
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
    // random을 0으로 고정(시작 각도 지터 없음). 기준점이 기존 스티커 오른쪽 끝(x=300)에서
    // 최소 간격만큼 떨어진 x=470에 잡히고, 오른쪽 반원(-90~90도)만 훑으므로 두 스티커 모두
    // x=470을 유지한 채 y축 방향으로만 벌어진다 — 직접 계산해 확인함.
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
    // 정확한 기준점 거리 공식과 결합하지 않고, "중앙 근처"인지만 넉넉한 여유로 확인한다.
    const CENTER_SANITY_MARGIN = 400;
    const newStickers = [fakeSticker({ id: 'a' }), fakeSticker({ id: 'b' })];

    const result = computeInitialLayout(newStickers, [], viewport);

    result.forEach((sticker) => {
      expect(Math.abs(sticker.posX - viewport.width / 2)).toBeLessThan(CENTER_SANITY_MARGIN);
      expect(Math.abs(sticker.posY - viewport.height / 2)).toBeLessThan(CENTER_SANITY_MARGIN);
    });
  });

  it('배치된 새 스티커들은 서로 가까이 뭉쳐 있다', () => {
    // 나선형 탐색으로 바꾼 뒤 시뮬레이션(2000회)한 실측값 기준 스티커 4개일 때 최대 뭉침거리가
    // 313px이라, 450px로 여유 있게 잡아 회귀를 잡을 수 있게 했다.
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
