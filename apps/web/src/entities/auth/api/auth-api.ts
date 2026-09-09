import { createApiClient, type paths, unwrapData, unwrapVoid } from '@ppotto/api';

import { api } from '@/shared/api/client';

export type WebLoginInput =
  paths['/auth/login/web']['post']['requestBody']['content']['application/json'];
export type RefreshInput =
  paths['/auth/refresh']['post']['requestBody']['content']['application/json'];

// getToken이 붙은 공용 클라이언트를 쓰면 refresh가 getAccessToken을 다시 호출한다.
const authClient = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '' });

export const authApi = {
  loginWeb: (input: WebLoginInput) =>
    unwrapData(authClient.POST('/auth/login/web', { body: input })),
  refresh: (input: RefreshInput) => unwrapData(authClient.POST('/auth/refresh', { body: input })),
  // 인증이 필요한 엔드포인트라 토큰이 붙는 공용 클라이언트를 쓴다.
  logout: () => unwrapVoid(api.POST('/auth/logout')),
};
