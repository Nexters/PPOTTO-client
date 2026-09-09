import { createApiClient } from '@ppotto/api';

import { bridge } from '@/shared/lib/bridge';
import { isDevelopmentBrowser } from '@/shared/lib/runtime-environment';

import { getDevelopmentAccessToken } from './browser-dev-session';

async function getAccessToken(forceRefresh: boolean) {
  const developmentToken = await getDevelopmentAccessToken({ forceRefresh });
  if (developmentToken !== undefined) {
    if (developmentToken === null) window.location.assign('/login');
    return developmentToken;
  }
  return (await bridge.request('GET_ACCESS_TOKEN', { forceRefresh })).accessToken;
}

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  getToken: () => getAccessToken(false),
  refreshAccessToken: () => getAccessToken(true),
  onAuthExpired: () => {
    if (isDevelopmentBrowser()) window.location.assign('/login');
    else bridge.send('AUTH_EXPIRED');
  },
});
