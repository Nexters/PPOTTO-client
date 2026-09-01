const REFRESH_TOKEN_KEY = 'ppotto.dev.refresh-token';
const DEV_PASSWORD = 'password1!';
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let refreshPromise: Promise<string | null> | null = null;

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

type NativeBridgeWindow = Window & {
  ReactNativeWebView?: unknown;
  WebViewBridgeKit?: unknown;
  webkit?: { messageHandlers?: { webviewBridgeKit?: unknown } };
};

class DevAuthError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(`개발 인증 요청 실패 (${status})`);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTokenBundle = (value: unknown): value is TokenBundle =>
  isRecord(value) &&
  typeof value.accessToken === 'string' &&
  typeof value.refreshToken === 'string' &&
  typeof value.accessTokenExpiresIn === 'number';

export function isDevelopmentBrowser() {
  if (
    (process.env.NODE_ENV !== 'development' &&
      process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== 'true') ||
    typeof window === 'undefined'
  )
    return false;
  const host = window as NativeBridgeWindow;
  return !(
    host.ReactNativeWebView ||
    host.webkit?.messageHandlers?.webviewBridgeKit ||
    host.WebViewBridgeKit
  );
}

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

async function responseError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const error = isRecord(body) && isRecord(body.error) ? body.error : null;
  return new DevAuthError(
    response.status,
    typeof error?.code === 'string' ? error.code : undefined,
  );
}

async function requestTokens(path: string, body: Record<string, string>) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await responseError(response);

  const payload: unknown = await response.json().catch(() => null);
  const data = isRecord(payload) ? payload.data : null;
  if (!isTokenBundle(data)) throw new Error('개발 인증 응답 형식이 올바르지 않습니다.');
  return data;
}

export async function loginWithDevelopmentEmail(email: string) {
  if (!isDevelopmentBrowser()) throw new Error('일반 브라우저 개발 환경에서만 사용할 수 있습니다.');
  const tokens = await requestTokens('/dev/auth/login', {
    email: email.trim(),
    password: DEV_PASSWORD,
  });
  saveTokens(tokens);
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const tokens = await requestTokens('/auth/refresh', { refreshToken });
    saveTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    if (!(error instanceof DevAuthError) || error.code !== 'AUTH-002') throw error;
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

export async function logoutDevelopmentSession() {
  const token = await getDevelopmentAccessToken();
  if (token === undefined) throw new Error('개발 로그인 세션이 없습니다.');
  if (token === null) return;

  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await responseError(response);
  clearDevelopmentSession();
}
