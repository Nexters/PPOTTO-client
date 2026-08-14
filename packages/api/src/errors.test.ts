import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  HttpError,
  MalformedResponseError,
  unwrapData,
  unwrapNullableData,
  unwrapVoid,
} from './errors.ts';

/**
 * 동작 범위 (2026-07-28 인터뷰)
 *
 * 성공 판단은 HTTP status 기준이며 엔벨로프의 success 필드는 보지 않는다.
 * 2xx인데 payload가 없는 계약 위반은 MalformedResponseError로 구분한다
 * (HttpError는 사용자 안내, NetworkError는 재시도, 이건 백엔드에 제시).
 *
 * 제외: 401 → refresh rotation 자동 재시도 — 브릿지 경계 작업에서 별도 결정
 * 제외: 200 + success:false 인 void 응답이 조용히 성공 처리됨 — HTTP status 기준
 *       결정의 알려진 부작용. 스펙상 에러코드는 전부 4xx/5xx 매핑이라 정상 경로에선 발생 불가
 * 제외: 중복 요청 제거, 실패 재시도 — react-query 몫
 */

/**
 * openapi-fetch가 실제로 반환하는 결과 모양을 만든다.
 * 2xx면 파싱된 바디 전체가 data에, 4xx/5xx면 error에 담긴다(JSON이 아니면 문자열).
 * 바디 없는 2xx는 data·error가 모두 undefined다.
 */
function apiResult<T>(init: {
  status: number;
  data?: { success: boolean; data?: T; error?: unknown };
  error?: unknown;
}) {
  return Promise.resolve({
    data: init.data,
    error: init.error,
    response: new Response(null, { status: init.status }),
  });
}

const errorEnvelope = (code: string, message: string) => ({
  success: false,
  error: { code, message, fieldErrors: [], timestamp: '2026-07-28T00:00:00Z' },
});

describe('unwrapData', () => {
  it('2xx 응답에서 엔벨로프를 벗겨 payload를 반환한다', async () => {
    const result = apiResult({
      status: 200,
      data: { success: true, data: { id: 'board-1', name: '내 보드' } },
    });

    assert.deepEqual(await unwrapData(result), { id: 'board-1', name: '내 보드' });
  });

  it('2xx인데 data가 없으면 MalformedResponseError를 던진다', async () => {
    const result = apiResult({ status: 200, data: { success: true } });

    await assert.rejects(unwrapData(result), (error: unknown) => {
      assert.ok(error instanceof MalformedResponseError);
      assert.equal(error.status, 200);
      return true;
    });
  });

  it('4xx/5xx면 HttpError를 던지고 status와 code를 담는다', async () => {
    const result = apiResult({
      status: 404,
      error: errorEnvelope('BOARD-002', '보드 없음'),
    });

    await assert.rejects(unwrapData(result), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 404);
      assert.equal(error.code, 'BOARD-002');
      return true;
    });
  });

  it('엔벨로프가 아닌 바디면 code 없이 HttpError를 던진다', async () => {
    // 게이트웨이 502는 JSON이 아니라서 openapi-fetch가 error에 원문 문자열을 담는다
    const result = apiResult({ status: 502, error: '<html>502 Bad Gateway</html>' });

    await assert.rejects(unwrapData(result), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 502);
      assert.equal(error.code, undefined);
      assert.equal(error.body, '<html>502 Bad Gateway</html>');
      return true;
    });
  });
});

describe('unwrapVoid', () => {
  it('2xx면 정상 종료하고 반환값이 없다', async () => {
    // void 엔드포인트의 성공 응답은 data·error가 모두 없다
    const result = apiResult({ status: 200 });

    assert.equal(await unwrapVoid(result), undefined);
  });

  it('4xx/5xx면 HttpError를 던지고 code를 담는다', async () => {
    const result = apiResult({
      status: 409,
      error: errorEnvelope('BOARD-004', '마지막 보드는 삭제할 수 없습니다'),
    });

    await assert.rejects(unwrapVoid(result), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 409);
      assert.equal(error.code, 'BOARD-004');
      return true;
    });
  });
});

describe('unwrapNullableData', () => {
  it('2xx 응답의 null payload를 정상 값으로 반환한다', async () => {
    const result = apiResult({ status: 200, data: { success: true, data: null } });

    assert.equal(await unwrapNullableData(result), null);
  });

  it('2xx 응답에 data 키가 아예 없어도 null로 반환한다', async () => {
    // 서버가 null 필드를 생략해 {"success":true}만 오는 경우 (GET /analysis/active)
    const result = apiResult({ status: 200, data: { success: true } });

    assert.equal(await unwrapNullableData(result), null);
  });
});
