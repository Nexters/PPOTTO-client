/**
 * 동작 범위 (2026-08-04 인터뷰)
 *
 * 제외: 스티커 4개 미만(분석 실패로 부분 생성 추정) — 실제 발생 여부 불확실
 * 제외: 스티커 6개 초과 — 발생 가능성 낮음, 정책상 4~6 고정
 *
 * [팀확인] 스티커 새로 생성 시 기존 배치된 스티커를 자동으로 구석에 재배치하는지 — 기획 확인 대기
 * [팀확인] 새로 생성된 스티커끼리 모아서 배치해야 하는지, 빈 곳 아무데나 둬도 되는지 — 기획/디자인 확인 대기
 */
import { describe, it } from 'vitest';

describe('needsInitialLayout', () => {
  it.todo('모든 스티커의 posX/posY가 0이면 true를 반환한다');
  it.todo('스티커 중 하나라도 posX 또는 posY가 0이 아니면 false를 반환한다');
  it.todo('스티커 배열이 비어 있으면 true를 반환한다');
});

describe('computeInitialLayout', () => {
  it.todo('스티커 개수만큼 zIndex를 1부터 순서대로 매긴다');
  it.todo('TEXT 타입 스티커는 badgeOffsetY가 -56으로 고정된다');
  it.todo('IMAGE 타입 스티커는 프리셋의 badgeOffsetY를 그대로 사용한다');
});

describe('toLayoutInput', () => {
  it.todo('badgeRotation을 rotation의 음수값으로 계산해 반환한다');
  it.todo('저장 API 스펙 필드만 담아 반환한다');
});
