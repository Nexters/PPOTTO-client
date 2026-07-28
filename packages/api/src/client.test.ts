import { describe, it } from 'node:test';

/**
 * 커스텀 fetch 주입(ClientOptions.fetch)으로 Request를 가로채 검증한다. mock 라이브러리 없음.
 *
 * 제외: 401 → refresh rotation 자동 재시도 — 브릿지 경계 작업에서 별도 결정
 * [팀확인] getToken이 네이티브 브릿지 호출이 될지 여부 — 브릿지 경계 작업에서 결정
 */

describe('createApiClient auth 미들웨어', () => {
  it.todo('토큰이 있으면 Authorization: Bearer 헤더를 붙인다');
  it.todo('토큰이 null이면 헤더를 붙이지 않는다');
  it.todo('getToken이 예외를 던지면 요청을 보내지 않고 예외를 전파한다');
});
