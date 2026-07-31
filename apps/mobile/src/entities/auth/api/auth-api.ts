import { createApiClient, type paths, unwrapData } from '@ppotto/api';

export type LoginInput = paths['/auth/login']['post']['requestBody']['content']['application/json'];
export type RefreshInput =
  paths['/auth/refresh']['post']['requestBody']['content']['application/json'];

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!baseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required');
}

// getToken이 붙은 공용 클라이언트를 쓰면 refresh가 getAccessToken을 다시 호출한다.
const authClient = createApiClient({ baseUrl });

export const authApi = {
  login: (input: LoginInput) => unwrapData(authClient.POST('/auth/login', { body: input })),
  refresh: (input: RefreshInput) => unwrapData(authClient.POST('/auth/refresh', { body: input })),
};
