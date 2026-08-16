import { createApiClient } from '@ppotto/api';

import { bridge } from '@/shared/lib/bridge';

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  getToken: async () =>
    (await bridge.request('GET_ACCESS_TOKEN', { forceRefresh: false })).accessToken,
  refreshAccessToken: async () =>
    (await bridge.request('GET_ACCESS_TOKEN', { forceRefresh: true })).accessToken,
  onAuthExpired: () => bridge.send('AUTH_EXPIRED'),
});
