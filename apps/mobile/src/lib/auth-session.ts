import * as SecureStore from 'expo-secure-store';
import { HttpError, NetworkError } from '@ppotto/api';

import { authApi } from '@/entities/auth/api/auth-api';

import { signInWithApple } from './apple-auth';
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

    accessToken = null;
    accessTokenExpiresAt = 0;
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    return null;
  }
}

export type LoginResult = Pick<LoginResponse, 'isNewUser' | 'pendingTerms'> | null;

export async function loginWithApple(): Promise<LoginResult> {
  const credential = await signInWithApple();
  if (!credential) return null; // 사용자 취소

  const data = await authApi.login({
    provider: 'APPLE',
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    rawNonce: credential.rawNonce,
  });
  await saveTokens(data);
  return { isNewUser: data.isNewUser, pendingTerms: data.pendingTerms };
}

export async function loginWithKakao(): Promise<LoginResult> {
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
