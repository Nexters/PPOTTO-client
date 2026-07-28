import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApiClient, type ApiClientOptions } from './client.ts';
import { NetworkError, unwrapData, unwrapVoid } from './errors.ts';

/**
 * 동작 범위 (2026-07-28 인터뷰)
 *
 * 커스텀 fetch 주입(ClientOptions.fetch)으로 Request를 가로채 검증한다. mock 라이브러리 없음.
 *
 * 제외: 401 → refresh rotation 자동 재시도 — 브릿지 경계 작업에서 별도 결정
 * [팀확인] getToken이 네이티브 브릿지 호출이 될지 여부 — 브릿지 경계 작업에서 결정
 */

/**
 * 스텁 fetch로 Request를 가로채 모은다. 실제 네트워크는 나가지 않는다.
 * 미들웨어의 관찰 가능한 결과는 "어떤 Request가 나갔는가"뿐이라 실제 요청을 한 번 태운다.
 * 파라미터가 없는 GET /terms를 쓴다.
 */
function clientCapturingRequests(options: Omit<ApiClientOptions, 'baseUrl' | 'fetch'>) {
  const requests: Request[] = [];

  const client = createApiClient({
    baseUrl: 'http://api.test',
    fetch: async (request) => {
      requests.push(request);
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
    ...options,
  });

  return { client, requests };
}

describe('createApiClient auth 미들웨어', () => {
  it('토큰이 있으면 Authorization: Bearer 헤더를 붙인다', async () => {
    const { client, requests } = clientCapturingRequests({ getToken: () => 'token-abc' });

    await client.GET('/terms');

    assert.equal(requests[0]?.headers.get('Authorization'), 'Bearer token-abc');
  });

  it('토큰이 null이면 헤더를 붙이지 않는다', async () => {
    const { client, requests } = clientCapturingRequests({ getToken: () => null });

    await client.GET('/terms');

    assert.equal(requests[0]?.headers.get('Authorization'), null);
  });

  it('getToken이 예외를 던지면 요청을 보내지 않고 예외를 전파한다', async () => {
    const bridgeFailure = new Error('브릿지 응답 없음');
    const { client, requests } = clientCapturingRequests({
      getToken: () => {
        throw bridgeFailure;
      },
    });

    await assert.rejects(unwrapData(client.GET('/terms')), (error: unknown) => {
      assert.equal(error, bridgeFailure);
      return true;
    });
    assert.equal(requests.length, 0);
  });
});

describe('createApiClient 오류 경계', () => {
  it('fetch 자체가 실패하면 NetworkError로 변환한다', async () => {
    const offline = new TypeError('fetch failed');
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw offline;
      },
    });

    await assert.rejects(unwrapData(client.GET('/terms')), (error: unknown) => {
      assert.ok(error instanceof NetworkError);
      assert.equal(error.cause, offline);
      return true;
    });
  });

  it('data 없는 요청도 fetch 실패를 NetworkError로 변환한다', async () => {
    const offline = new TypeError('fetch failed');
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw offline;
      },
    });

    await assert.rejects(unwrapVoid(client.DELETE('/users/me')), (error: unknown) => {
      assert.ok(error instanceof NetworkError);
      assert.equal(error.cause, offline);
      return true;
    });
  });

  it('잘못된 JSON 응답은 파싱 오류를 그대로 전파한다', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () =>
        new Response('{', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });

    await assert.rejects(unwrapData(client.GET('/terms')), SyntaxError);
  });

  it('요청 취소는 AbortError를 그대로 전파한다', async () => {
    const aborted = new DOMException('요청 취소', 'AbortError');
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw aborted;
      },
    });

    await assert.rejects(unwrapData(client.GET('/terms')), (error: unknown) => {
      assert.equal(error, aborted);
      return true;
    });
  });
});
