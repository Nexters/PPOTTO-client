jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock('@/entities/auth/api/auth-api', () => ({
  authApi: {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  },
}));
jest.mock('@/entities/user/api/user-api', () => ({
  userApi: {
    withdraw: jest.fn(),
  },
}));
jest.mock('./apple-auth', () => ({ signInWithApple: jest.fn() }));
jest.mock('./kakao-auth', () => ({
  KakaoLoginCancelledError: class KakaoLoginCancelledError extends Error {},
  signInWithKakao: jest.fn(),
}));

/**
 * 동작 범위 (2026-07-31 인터뷰)
 *
 * accessToken은 RN 메모리에, refreshToken은 SecureStore에 보관한다.
 * accessToken이 없거나 만료되면 refreshToken으로 갱신하며, 동시에 들어온 호출은 같은 갱신을 기다린다.
 *
 * 네트워크 오류·서버 5xx는 한 번 자동 재시도한다. 다시 실패하면 refreshToken을 보존한 채
 * 재시도 가능한 오류를 반환한다. refreshToken이 없거나 AUTH-002이면 세션 만료로 처리한다.
 *
 * 로그아웃·탈퇴는 서버 호출이 성공했을 때만 기기 세션을 정리한다. 실패하면 로그인 상태를 유지해
 * 다시 시도할 수 있게 한다.
 *
 * 제외: accessToken의 SecureStore 저장
 * 제외: 네트워크 복구 감지 후 백그라운드 자동 재시도
 */

type Session = typeof import('./auth-session');

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

function tokenBundle(name: string, accessTokenExpiresIn = 3600): TokenBundle {
  return {
    accessToken: `${name}-access`,
    refreshToken: `${name}-refresh`,
    accessTokenExpiresIn,
  };
}

function setupSession(storedRefreshToken: string | null = 'stored-refresh') {
  jest.resetModules();

  const secureStore = jest.requireMock('expo-secure-store') as {
    deleteItemAsync: jest.Mock;
    getItemAsync: jest.Mock;
    setItemAsync: jest.Mock;
  };
  const { authApi } = jest.requireMock('@/entities/auth/api/auth-api') as {
    authApi: { login: jest.Mock; refresh: jest.Mock; logout: jest.Mock };
  };
  const { userApi } = jest.requireMock('@/entities/user/api/user-api') as {
    userApi: { withdraw: jest.Mock };
  };
  const { signInWithKakao } = jest.requireMock('./kakao-auth') as {
    signInWithKakao: jest.Mock;
  };

  jest.clearAllMocks();
  secureStore.getItemAsync.mockResolvedValue(storedRefreshToken);
  secureStore.setItemAsync.mockResolvedValue(undefined);
  secureStore.deleteItemAsync.mockResolvedValue(undefined);

  const api = jest.requireActual<typeof import('@ppotto/api')>('@ppotto/api');
  const session = jest.requireActual<Session>('./auth-session');

  return { api, authApi, secureStore, session, signInWithKakao, userApi };
}

async function login(
  session: Session,
  authApi: { login: jest.Mock },
  signInWithKakao: jest.Mock,
  tokens: TokenBundle,
) {
  signInWithKakao.mockResolvedValue('kakao-access');
  authApi.login.mockResolvedValue({ ...tokens, isNewUser: false, pendingTerms: [] });
  await session.loginWithKakao();
}

afterEach(() => {
  jest.useRealTimers();
});

describe('인증 세션', () => {
  it('앱 재실행처럼 메모리 accessToken이 없으면 저장된 refreshToken으로 갱신하고 교체된 토큰을 저장한다', async () => {
    const { authApi, secureStore, session } = setupSession('stored-refresh');
    authApi.refresh.mockResolvedValue(tokenBundle('rotated'));

    const accessToken = await session.getAccessToken();

    expect(accessToken).toBe('rotated-access');
    expect(authApi.refresh).toHaveBeenCalledWith({ refreshToken: 'stored-refresh' });
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), 'rotated-refresh');
  });

  it('refreshToken 저장에 실패하면 새 accessToken을 메모리에 남기지 않는다', async () => {
    const { authApi, secureStore, session, signInWithKakao } = setupSession(null);
    const writeFailure = new Error('SecureStore write failed');
    signInWithKakao.mockResolvedValue('kakao-access');
    authApi.login.mockResolvedValue({
      ...tokenBundle('not-saved'),
      isNewUser: false,
      pendingTerms: [],
    });
    secureStore.setItemAsync.mockRejectedValue(writeFailure);

    await expect(session.loginWithKakao()).rejects.toBe(writeFailure);
    await expect(session.getAccessToken()).resolves.toBeNull();
  });

  it('저장된 refreshToken이 없으면 로그인되지 않은 상태를 반환한다', async () => {
    const { authApi, session } = setupSession(null);

    await expect(session.getAccessToken()).resolves.toBeNull();

    expect(authApi.refresh).not.toHaveBeenCalled();
  });

  it('메모리 accessToken이 만료되면 저장된 refreshToken으로 갱신한다', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-31T10:00:00Z'));
    const { authApi, session, signInWithKakao } = setupSession('stored-refresh');
    await login(session, authApi, signInWithKakao, tokenBundle('expired', 1));
    jest.advanceTimersByTime(2_000);
    authApi.refresh.mockResolvedValue(tokenBundle('fresh'));

    const accessToken = await session.getAccessToken();

    expect(accessToken).toBe('fresh-access');
  });

  it('동시에 강제 갱신을 요청해도 만료 시각과 무관하게 refresh API를 한 번만 호출한다', async () => {
    const { authApi, session, signInWithKakao } = setupSession('stored-refresh');
    await login(session, authApi, signInWithKakao, tokenBundle('locally-valid'));
    let finishRefresh!: (tokens: TokenBundle) => void;
    authApi.refresh.mockReturnValue(
      new Promise<TokenBundle>((resolve) => {
        finishRefresh = resolve;
      }),
    );

    const first = session.getAccessToken({ forceRefresh: true });
    const second = session.getAccessToken({ forceRefresh: true });
    await Promise.resolve();
    finishRefresh(tokenBundle('shared'));
    const accessTokens = await Promise.all([first, second]);

    expect(accessTokens).toEqual(['shared-access', 'shared-access']);
    expect(authApi.refresh).toHaveBeenCalledTimes(1);
  });

  it.each(['네트워크 오류', '서버 5xx'])(
    'refresh 중 %s가 계속 발생하면 한 번 재시도하고 refreshToken을 보존한다',
    async (failureType) => {
      const { api, authApi, secureStore, session } = setupSession('stored-refresh');
      const failure =
        failureType === '네트워크 오류'
          ? new api.NetworkError(new TypeError('offline'))
          : new api.HttpError(500, 'COMMON-003', {});
      authApi.refresh.mockRejectedValue(failure);

      await expect(session.getAccessToken()).rejects.toMatchObject({ name: failure.name });

      expect(authApi.refresh).toHaveBeenCalledTimes(2);
      expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['로그아웃', (session: Session) => session.logout()],
    ['탈퇴', (session: Session) => session.withdraw()],
  ])('%s에 성공하면 메모리 accessToken과 저장된 refreshToken을 모두 버린다', async (_, run) => {
    const { authApi, secureStore, session, signInWithKakao, userApi } = setupSession();
    await login(session, authApi, signInWithKakao, tokenBundle('live'));
    authApi.logout.mockResolvedValue(undefined);
    userApi.withdraw.mockResolvedValue(undefined);

    await run(session);

    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    // refreshToken이 남아 있어도 갱신을 시도하지 않도록 저장소를 비운 상태로 확인한다.
    secureStore.getItemAsync.mockResolvedValue(null);
    await expect(session.getAccessToken()).resolves.toBeNull();
  });

  it.each([
    ['로그아웃', (session: Session) => session.logout()],
    ['탈퇴', (session: Session) => session.withdraw()],
  ])('%s API가 실패하면 세션을 유지해 다시 시도할 수 있게 한다', async (_, run) => {
    const { api, authApi, secureStore, session, signInWithKakao, userApi } = setupSession();
    await login(session, authApi, signInWithKakao, tokenBundle('live'));
    const failure = new api.NetworkError(new TypeError('offline'));
    authApi.logout.mockRejectedValue(failure);
    userApi.withdraw.mockRejectedValue(failure);

    await expect(run(session)).rejects.toMatchObject({ name: failure.name });

    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
    await expect(session.getAccessToken()).resolves.toBe('live-access');
  });

  it('AUTH-002를 받으면 저장된 refreshToken을 제거하고 로그인되지 않은 상태를 반환한다', async () => {
    const { api, authApi, secureStore, session } = setupSession('expired-refresh');
    const expired = new api.HttpError(401, 'AUTH-002', {});
    authApi.refresh.mockRejectedValue(expired);

    await expect(session.getAccessToken()).resolves.toBeNull();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
  });
});
