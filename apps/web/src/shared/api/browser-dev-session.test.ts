import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REDIRECT_URI = 'http://localhost:3000/login';

const tokenResponse = (accessToken: string, refreshToken: string, accessTokenExpiresIn: number) =>
  new Response(
    JSON.stringify({
      success: true,
      data: { accessToken, refreshToken, accessTokenExpiresIn },
      error: null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

const errorResponse = (status: number, code: string) =>
  new Response(JSON.stringify({ success: false, data: null, error: { code } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const requestAt = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, index: number) =>
  fetchMock.mock.calls[index]![0] as Request;

// openapi-fetch는 클라이언트를 만들 때 global fetch를 붙잡으므로 stub 뒤에 모듈을 새로 불러온다.
async function loadSession(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) {
  vi.stubGlobal('fetch', fetchMock);
  vi.resetModules();
  return import('./browser-dev-session');
}

describe('browser dev session', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('인가 code로 로그인한 뒤 만료 토큰을 한 번만 갱신하고 로그아웃한다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('login-access', 'login-refresh', 0))
      .mockResolvedValueOnce(tokenResponse('fresh-access', 'fresh-refresh', 3600))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const session = await loadSession(fetchMock);

    await session.completeKakaoLogin('kakao-code', REDIRECT_URI);

    const login = requestAt(fetchMock, 0);
    expect(login.url).toBe('http://api.test/auth/login/web');
    expect(login.method).toBe('POST');
    await expect(login.json()).resolves.toEqual({
      provider: 'KAKAO',
      authorizationCode: 'kakao-code',
      redirectUri: REDIRECT_URI,
    });
    expect(session.hasDevelopmentSession()).toBe(true);

    await expect(
      Promise.all([session.getDevelopmentAccessToken(), session.getDevelopmentAccessToken()]),
    ).resolves.toEqual(['fresh-access', 'fresh-access']);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await session.logoutDevelopmentSession();

    const logout = requestAt(fetchMock, 2);
    expect(logout.url).toBe('http://api.test/auth/logout');
    expect(logout.method).toBe('POST');
    expect(logout.headers.get('Authorization')).toBe('Bearer fresh-access');
    expect(session.hasDevelopmentSession()).toBe(false);
  });

  it('refresh token이 만료되면(AUTH-002) 세션을 버리고 null을 돌려준다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('login-access', 'login-refresh', 0))
      .mockResolvedValueOnce(errorResponse(401, 'AUTH-002'));
    const session = await loadSession(fetchMock);

    await session.completeKakaoLogin('kakao-code', REDIRECT_URI);

    await expect(session.getDevelopmentAccessToken()).resolves.toBeNull();
    expect(session.hasDevelopmentSession()).toBe(false);
  });

  it('탈퇴하면 계정을 지우고 세션을 정리한다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('login-access', 'login-refresh', 3600))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const session = await loadSession(fetchMock);

    await session.completeKakaoLogin('kakao-code', REDIRECT_URI);
    await session.withdrawDevelopmentSession();

    const withdraw = requestAt(fetchMock, 1);
    expect(withdraw.url).toBe('http://api.test/users/me');
    expect(withdraw.method).toBe('DELETE');
    expect(withdraw.headers.get('Authorization')).toBe('Bearer login-access');
    expect(session.hasDevelopmentSession()).toBe(false);
  });

  it('탈퇴가 거절되면 세션을 유지한다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('login-access', 'login-refresh', 3600))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const session = await loadSession(fetchMock);

    await session.completeKakaoLogin('kakao-code', REDIRECT_URI);

    await expect(session.withdrawDevelopmentSession()).rejects.toThrow();
    expect(session.hasDevelopmentSession()).toBe(true);
  });
});
