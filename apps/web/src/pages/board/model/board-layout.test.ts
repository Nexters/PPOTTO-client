/**
 * 동작 범위 (2026-08-04 인터뷰)
 *
 * 제외: 스티커 4개 미만(분석 실패로 부분 생성 추정) — 실제 발생 여부 불확실
 * 제외: 스티커 6개 초과 — 발생 가능성 낮음, 정책상 4~6 고정
 *
 * [팀확인] 스티커 새로 생성 시 기존 배치된 스티커를 자동으로 구석에 재배치하는지 — 기획 확인 대기
 * [팀확인] 새로 생성된 스티커끼리 모아서 배치해야 하는지, 빈 곳 아무데나 둬도 되는지 — 기획/디자인 확인 대기
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
  // 정책상 스티커는 항상 4~6개이므로, 테스트 입력도 이 범위 안에서만 구성한다.
  it('스티커 개수만큼 zIndex를 1부터 순서대로 매긴다', () => {
    const stickers = [
      fakeSticker({ id: 'a' }),
      fakeSticker({ id: 'b' }),
      fakeSticker({ id: 'c' }),
      fakeSticker({ id: 'd' }),
    ];

    const result = computeInitialLayout(stickers);

    expect(result.map((sticker) => sticker.zIndex)).toEqual([1, 2, 3, 4]);
  });

  it('TEXT 타입 스티커는 badgeOffsetY가 -56으로 고정된다', () => {
    const stickers = [
      fakeSticker({ id: 'a' }),
      fakeSticker({ id: 'b' }),
      fakeSticker({ id: 'c' }),
      fakeSticker({ id: 'd', type: 'TEXT' }),
    ];

    const result = computeInitialLayout(stickers);

    expect(result[3]?.badgeOffsetY).toBe(-56);
  });

  it('IMAGE 타입 스티커는 프리셋의 badgeOffsetY를 그대로 사용한다', () => {
    const stickers = [
      fakeSticker({ id: 'a' }),
      fakeSticker({ id: 'b' }),
      fakeSticker({ id: 'c' }),
      fakeSticker({ id: 'd' }),
    ];

    const result = computeInitialLayout(stickers);

    expect(result[0]?.badgeOffsetY).toBe(-38);
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
