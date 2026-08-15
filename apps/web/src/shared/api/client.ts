import { createApiClient } from '@ppotto/api';

import { bridge } from '@/shared/lib/bridge';
import { recordBridgeFailure } from '@/shared/lib/hyperdx';

async function requestAccessToken(forceRefresh: boolean) {
  try {
    return (await bridge.request('GET_ACCESS_TOKEN', { forceRefresh })).accessToken;
  } catch (error) {
    recordBridgeFailure('GET_ACCESS_TOKEN', error);
    throw error;
  }
}

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  getToken: () => requestAccessToken(false),
  refreshAccessToken: () => requestAccessToken(true),
  onAuthExpired: () => bridge.send('AUTH_EXPIRED'),
});
