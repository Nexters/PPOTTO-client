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
 *
 * [팀확인] 실제 스티커 크기 정규화 규칙(가로 고정/가로+세로 고정 등) — 백엔드·디자인 확인 대기,
 * 지금은 반경 85px 플레이스홀더로 진행한다.
 */
import { describe, expect, it } from 'vitest';

import { needsInitialLayout, toLayoutInput } from './board-layout';

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
  it.todo('새 스티커들은 서로 겹치지 않게 배치된다');
  it.todo('기존 배치된 스티커가 있으면 그 스티커들의 경계 상자 근처에 새 스티커들을 배치한다');
  it.todo('기존 배치된 스티커가 없으면 뷰포트 중앙 근처에 새 스티커들을 배치한다');
  it.todo('배치된 새 스티커들은 서로 가까이 뭉쳐 있다');
  it.todo('최대 시도 횟수 동안 겹치지 않는 자리를 못 찾으면 겹치더라도 마지막 후보를 사용한다');
  it.todo('회전 각도는 -15도에서 15도 사이로 무작위 배정된다');
  it.todo('zIndex는 기존 스티커의 최댓값보다 크게 이어서 매겨진다');
  it.todo('TEXT 타입 스티커는 badgeOffsetY가 -56으로 고정된다');
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
