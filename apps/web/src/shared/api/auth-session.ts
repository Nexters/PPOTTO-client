import { bridge } from '@/shared/lib/bridge';
import { isDevelopmentBrowser } from '@/shared/lib/runtime-environment';

import { getDevelopmentAccessToken } from './browser-dev-session';

export async function getApiAccessToken(forceRefresh = false) {
  const developmentToken = await getDevelopmentAccessToken({ forceRefresh });
  if (developmentToken !== undefined) {
    if (developmentToken === null) window.location.assign('/login');
    return developmentToken;
  }
  return (await bridge.request('GET_ACCESS_TOKEN', { forceRefresh })).accessToken;
}

export function handleApiAuthExpired() {
  if (isDevelopmentBrowser()) window.location.assign('/login');
  else bridge.send('AUTH_EXPIRED');
}
