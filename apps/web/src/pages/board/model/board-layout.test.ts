/**
 * 동작 범위 (2026-08-07 재구성)
 *
 * 스티커 초기 배치(빈 공간 탐색, 나선형 등)는 백엔드가 생성 시점에 계산해서 내려주는 것으로
 * 바뀌어서, 프론트에서 배치를 직접 계산하던 로직(computeInitialLayout 등)을 전부 제거했다.
 * 이제 board-layout.ts는 저장 API 요청 바디 변환(toLayoutInput)만 담당한다.
 *
 * 제외: 새로 배치된 스티커로 카메라 포커스 이동 — 별도 이슈로 분리
 */
import { describe, expect, it } from 'vitest';

import { toLayoutInput } from './board-layout';

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
