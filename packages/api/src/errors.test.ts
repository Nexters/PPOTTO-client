import { describe, it } from 'node:test';

/**
 * 성공 판단은 HTTP status 기준이며 엔벨로프의 success 필드는 보지 않는다.
 *
 * 제외: 401 → refresh rotation 자동 재시도 — 브릿지 경계 작업에서 별도 결정
 * 제외: 200 + success:false 인 void 응답이 조용히 성공 처리됨 — HTTP status 기준
 *       결정의 알려진 부작용. 스펙상 에러코드는 전부 4xx/5xx 매핑이라 정상 경로에선 발생 불가
 * 제외: 중복 요청 제거, 실패 재시도 — react-query 몫
 */

describe('unwrapData', () => {
  it.todo('2xx 응답에서 엔벨로프를 벗겨 payload를 반환한다');
  it.todo('2xx인데 data가 없으면 에러를 던진다');
  it.todo('4xx/5xx면 HttpError를 던지고 status와 code를 담는다');
  it.todo('엔벨로프가 아닌 바디면 code 없이 HttpError를 던진다');
  it.todo('fetch 자체가 실패하면 NetworkError를 던진다');
});

describe('unwrapVoid', () => {
  it.todo('2xx면 정상 종료하고 반환값이 없다');
  it.todo('4xx/5xx면 HttpError를 던지고 code를 담는다');
  it.todo('fetch 자체가 실패하면 NetworkError를 던진다');
});
