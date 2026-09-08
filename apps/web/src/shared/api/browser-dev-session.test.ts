import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  completeKakaoLogin,
  getDevelopmentAccessToken,
  hasDevelopmentSession,
  isDevelopmentBrowser,
  logoutDevelopmentSession,
  startKakaoLogin,
  withdrawDevelopmentSession,
} from './browser-dev-session';

const tokenResponse = (accessToken: string, refreshToken: string, accessTokenExpiresIn: number) =>
  new Response(
    JSON.stringify({
      success: true,
      data: { accessToken, refreshToken, accessTokenExpiresIn },
      error: null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

const REDIRECT_URI = 'http://localhost:3000/login';

describe('browser dev session', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete window.Kakao;
  });

  it('production에서는 명시적 플래그가 있을 때만 개발 브라우저를 허용한다', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isDevelopmentBrowser()).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    expect(isDevelopmentBrowser()).toBe(true);
  });

  it('카카오 인가 페이지로 보낼 때 /login을 redirect URI로 넘긴다', () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'js-key');
    const authorize = vi.fn();
    let initialized = false;
    window.Kakao = {
      init: () => {
        initialized = true;
      },
      isInitialized: () => initialized,
      Auth: { authorize },
      Share: { uploadImage: vi.fn() },
    };

    startKakaoLogin();

    expect(authorize).toHaveBeenCalledWith({ redirectUri: REDIRECT_URI });
  });

  it('인가 code로 로그인한 뒤 만료 토큰을 한 번만 갱신하고 로그아웃한다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('login-access', 'login-refresh', 0))
      .mockResolvedValueOnce(tokenResponse('fresh-access', 'fresh-refresh', 3600))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await completeKakaoLogin('kakao-code');

    const [loginUrl, loginInit] = fetchMock.mock.calls[0]!;
    expect(String(loginUrl)).toMatch(/\/auth\/login\/web$/);
    expect(JSON.parse(String(loginInit?.body))).toEqual({
      provider: 'KAKAO',
      authorizationCode: 'kakao-code',
      redirectUri: REDIRECT_URI,
    });
    expect(hasDevelopmentSession()).toBe(true);

    await expect(
      Promise.all([getDevelopmentAccessToken(), getDevelopmentAccessToken()]),
    ).resolves.toEqual(['fresh-access', 'fresh-access']);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await logoutDevelopmentSession();

    const [logoutUrl, logoutInit] = fetchMock.mock.calls[2]!;
    expect(String(logoutUrl)).toMatch(/\/auth\/logout$/);
    expect(logoutInit?.method).toBe('POST');
    expect(logoutInit?.headers).toEqual({ Authorization: 'Bearer fresh-access' });
    expect(hasDevelopmentSession()).toBe(false);
  });

  it('탈퇴하면 계정을 지우고 세션을 정리한다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('login-access', 'login-refresh', 3600))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await completeKakaoLogin('kakao-code');
    await withdrawDevelopmentSession();

    const [withdrawUrl, withdrawInit] = fetchMock.mock.calls[1]!;
    expect(String(withdrawUrl)).toMatch(/\/users\/me$/);
    expect(withdrawInit?.method).toBe('DELETE');
    expect(withdrawInit?.headers).toEqual({ Authorization: 'Bearer login-access' });
    expect(hasDevelopmentSession()).toBe(false);
  });

  it('탈퇴가 거절되면 세션을 유지한다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('login-access', 'login-refresh', 3600))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await completeKakaoLogin('kakao-code');

    await expect(withdrawDevelopmentSession()).rejects.toThrow();
    expect(hasDevelopmentSession()).toBe(true);
  });
});
