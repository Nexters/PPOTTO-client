import * as SecureStore from 'expo-secure-store';
import { HttpError, NetworkError } from '@ppotto/api';

import { authApi } from '@/entities/auth/api/auth-api';
import { userApi } from '@/entities/user/api/user-api';
import { track } from '@/shared/lib/analytics';

import { type AppleSignInCredential, signInWithApple } from './apple-auth';
import { KakaoLoginCancelledError, signInWithKakao } from './kakao-auth';

const REFRESH_TOKEN_KEY = 'ppotto.refresh-token';

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let refreshPromise: Promise<string | null> | null = null;

type LoginResponse = Awaited<ReturnType<typeof authApi.login>>;
type TokenBundle = Pick<LoginResponse, 'accessToken' | 'refreshToken' | 'accessTokenExpiresIn'>;

async function saveTokens(tokens: TokenBundle) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  accessToken = tokens.accessToken;
  accessTokenExpiresAt = Date.now() + tokens.accessTokenExpiresIn * 1000;
}

// accessToken은 서버가 회수할 수 없으므로 메모리에서 직접 지우고, refreshToken도 함께 버린다.
async function clearSession() {
  accessToken = null;
  accessTokenExpiresAt = 0;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

function isRetryable(error: unknown) {
  return error instanceof NetworkError || (error instanceof HttpError && error.status >= 500);
}

async function requestNewTokens(refreshToken: string) {
  try {
    return await authApi.refresh({ refreshToken });
  } catch (error) {
    if (!isRetryable(error)) throw error;
    return authApi.refresh({ refreshToken });
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const data = await requestNewTokens(refreshToken);
    await saveTokens(data);
    return data.accessToken;
  } catch (error) {
    if (!(error instanceof HttpError) || error.code !== 'AUTH-002') throw error;

    await clearSession();
    return null;
  }
}

export type LoginResult = Pick<LoginResponse, 'isNewUser' | 'pendingTerms'> | null;

async function trackLogin(method: 'apple' | 'kakao', login: () => Promise<LoginResult>) {
  track('login_started', { method });
  try {
    const result = await login();
    track(result ? 'login' : 'login_cancelled', { method });
    return result;
  } catch (error) {
    track('login_failed', {
      method,
      ...(error instanceof HttpError
        ? { http_status: error.status, ...(error.code ? { error_code: error.code } : {}) }
        : {}),
    });
    throw error;
  }
}

// 애플은 최초 인가 1회에만 fullName을 내려주며, 신규 가입은 서버가 name을 요구한다(AUTH-006).
function formatAppleName(fullName: AppleSignInCredential['fullName']): string | undefined {
  const name = [fullName?.familyName, fullName?.givenName].filter(Boolean).join('');
  return name.trim() || undefined;
}

export function loginWithApple(): Promise<LoginResult> {
  return trackLogin('apple', async () => {
    const credential = await signInWithApple();
    if (!credential) return null; // 사용자 취소

    const data = await authApi.login({
      provider: 'APPLE',
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
      rawNonce: credential.rawNonce,
      name: formatAppleName(credential.fullName),
    });
    await saveTokens(data);
    return { isNewUser: data.isNewUser, pendingTerms: data.pendingTerms };
  });
}

export function loginWithKakao(): Promise<LoginResult> {
  return trackLogin('kakao', async () => {
    let kakaoAccessToken: string;
    try {
      kakaoAccessToken = await signInWithKakao();
    } catch (error) {
      if (error instanceof KakaoLoginCancelledError) return null;
      throw error;
    }

    const data = await authApi.login({ provider: 'KAKAO', accessToken: kakaoAccessToken });
    await saveTokens(data);
    return { isNewUser: data.isNewUser, pendingTerms: data.pendingTerms };
  });
}

// 유효한 accessToken을 반환한다. 서버가 거부한 경우 forceRefresh로 만료 시각과 무관하게 갱신한다.
export async function getAccessToken({
  forceRefresh = false,
}: { forceRefresh?: boolean } = {}): Promise<string | null> {
  if (!forceRefresh && accessToken && Date.now() < accessTokenExpiresAt - 30_000) {
    return accessToken;
  }

  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

// 서버 세션을 먼저 끊고 기기 토큰을 지운다. API가 실패하면 세션을 유지해 다시 시도할 수 있게 한다.
export async function logout() {
  await authApi.logout();
  await clearSession();
  track('logout');
}

// 계정이 실제로 지워졌을 때만 세션을 정리한다. 실패했는데 토큰만 버리면 로그아웃과 구분되지 않는다.
export async function withdraw() {
  await userApi.withdraw();
  await clearSession();
  track('account_withdrawn');
}
