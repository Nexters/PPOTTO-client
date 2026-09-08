import { HttpError } from '@ppotto/api';

import { authApi } from '@/entities/auth/api/auth-api';
import { userApi } from '@/entities/user/api/user-api';
import { isDevelopmentBrowser } from '@/shared/lib/runtime-environment';

const REFRESH_TOKEN_KEY = 'ppotto.dev.refresh-token';

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let refreshPromise: Promise<string | null> | null = null;

type TokenBundle = Pick<
  Awaited<ReturnType<typeof authApi.refresh>>,
  'accessToken' | 'refreshToken' | 'accessTokenExpiresIn'
>;

export function hasDevelopmentSession() {
  return isDevelopmentBrowser() && localStorage.getItem(REFRESH_TOKEN_KEY) !== null;
}

function clearDevelopmentSession() {
  accessToken = null;
  accessTokenExpiresAt = 0;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function saveTokens(tokens: TokenBundle) {
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  accessToken = tokens.accessToken;
  accessTokenExpiresAt = Date.now() + tokens.accessTokenExpiresIn * 1000;
}

// 인가 요청에 쓴 redirectUri를 그대로 받아야 카카오가 code를 받아준다.
export async function completeKakaoLogin(authorizationCode: string, redirectUri: string) {
  if (!isDevelopmentBrowser()) throw new Error('일반 브라우저 개발 환경에서만 사용할 수 있습니다.');
  saveTokens(await authApi.loginWeb({ provider: 'KAKAO', authorizationCode, redirectUri }));
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const tokens = await authApi.refresh({ refreshToken });
    saveTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    if (!(error instanceof HttpError) || error.code !== 'AUTH-002') throw error;
    clearDevelopmentSession();
    return null;
  }
}

export async function getDevelopmentAccessToken({ forceRefresh = false } = {}) {
  if (!hasDevelopmentSession()) return undefined;
  if (!forceRefresh && accessToken && Date.now() < accessTokenExpiresAt - 30_000) {
    return accessToken;
  }

  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

// 서버가 거절하면 세션을 유지해 다시 시도할 수 있게 한다.
async function endSession(request: () => Promise<void>) {
  const token = await getDevelopmentAccessToken();
  if (token === undefined) throw new Error('개발 로그인 세션이 없습니다.');
  if (token === null) return;

  await request();
  clearDevelopmentSession();
}

export const logoutDevelopmentSession = () => endSession(authApi.logout);

export const withdrawDevelopmentSession = () => endSession(userApi.withdraw);
