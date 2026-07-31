import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApiClient, type ApiClientOptions } from './client.ts';
import { HttpError, NetworkError, unwrapData, unwrapVoid } from './errors.ts';

/**
 * 동작 범위 (2026-07-28, 2026-07-31 인터뷰)
 *
 * 커스텀 fetch 주입(ClientOptions.fetch)으로 Request를 가로채 검증한다. mock 라이브러리 없음.
 *
 * 인증 토큰의 발급·저장·동시 갱신은 RN 세션 책임이다. 이 모듈은 토큰을 헤더에 넣고,
 * 401 COMMON-004에서 토큰 갱신 후 원 요청을 한 번만 재실행한다.
 *
 * 제외: refreshToken 저장과 회전 — RN auth-session 책임
 * 제외: 인증 만료 후 화면 이동 — RN AppWebView 책임
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

describe('createApiClient 인증 갱신', () => {
  it('401 COMMON-004를 받으면 토큰을 갱신하고 원래 요청을 새 토큰으로 한 번 다시 보낸다', async () => {
    const requests: Request[] = [];
    let token = 'expired-access-token';
    let refreshCount = 0;
    const options: ApiClientOptions = {
      baseUrl: 'http://api.test',
      getToken: () => token,
      refreshAccessToken: async () => {
        refreshCount += 1;
        token = 'fresh-access-token';
        return token;
      },
      fetch: async (request) => {
        requests.push(request.clone());
        if (requests.length === 1) {
          return new Response(
            JSON.stringify({
              success: false,
              data: null,
              error: { code: 'COMMON-004', message: '인증이 필요합니다.' },
            }),
            { status: 401, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    };
    const client = createApiClient(options);

    await unwrapData(client.GET('/terms'));

    assert.equal(refreshCount, 1);
    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.headers.get('Authorization'), 'Bearer expired-access-token');
    assert.equal(requests[1]?.headers.get('Authorization'), 'Bearer fresh-access-token');
  });

  it('다시 보낸 요청도 401이면 추가 갱신 없이 인증 만료를 알린다', async () => {
    const requests: Request[] = [];
    let authExpiredCount = 0;
    let refreshCount = 0;
    const unauthorized = () =>
      new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: 'COMMON-004', message: '인증이 필요합니다.' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      );
    const options: ApiClientOptions = {
      baseUrl: 'http://api.test',
      getToken: () => 'expired-access-token',
      refreshAccessToken: async () => {
        refreshCount += 1;
        return 'fresh-access-token';
      },
      onAuthExpired: () => {
        authExpiredCount += 1;
      },
      fetch: async (request) => {
        requests.push(request.clone());
        return unauthorized();
      },
    };
    const client = createApiClient(options);

    await assert.rejects(unwrapData(client.GET('/terms')), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.code, 'COMMON-004');
      return true;
    });

    assert.equal(refreshCount, 1);
    assert.equal(authExpiredCount, 1);
    assert.equal(requests.length, 2);
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
