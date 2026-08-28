import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getDevelopmentAccessToken,
  hasDevelopmentSession,
  loginWithDevelopmentEmail,
  logoutDevelopmentSession,
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

describe('browser dev session', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('이메일 로그인 후 만료 토큰을 한 번만 갱신하고 로그아웃한다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('login-access', 'login-refresh', 0))
      .mockResolvedValueOnce(tokenResponse('fresh-access', 'fresh-refresh', 3600))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await loginWithDevelopmentEmail('dev@ppotto.co.kr');

    const [loginUrl, loginInit] = fetchMock.mock.calls[0]!;
    expect(String(loginUrl)).toMatch(/\/dev\/auth\/login$/);
    expect(JSON.parse(String(loginInit?.body))).toEqual({
      email: 'dev@ppotto.co.kr',
      password: 'password1!',
    });
    expect(hasDevelopmentSession()).toBe(true);

    await expect(
      Promise.all([getDevelopmentAccessToken(), getDevelopmentAccessToken()]),
    ).resolves.toEqual(['fresh-access', 'fresh-access']);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await logoutDevelopmentSession();

    const [logoutUrl, logoutInit] = fetchMock.mock.calls[2]!;
    expect(String(logoutUrl)).toMatch(/\/auth\/logout$/);
    expect(logoutInit?.headers).toEqual({ Authorization: 'Bearer fresh-access' });
    expect(hasDevelopmentSession()).toBe(false);
  });
});
