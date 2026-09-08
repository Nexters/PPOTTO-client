import { bridge } from '@/shared/lib/bridge';

import {
  hasDevelopmentSession,
  logoutDevelopmentSession,
  withdrawDevelopmentSession,
} from './browser-dev-session';

async function endBrowserSession(end: () => Promise<void>) {
  await end();
  window.location.assign('/login');
}

export async function logout() {
  if (hasDevelopmentSession()) return endBrowserSession(logoutDevelopmentSession);
  await bridge.request('LOGOUT');
}

export async function withdraw() {
  if (hasDevelopmentSession()) return endBrowserSession(withdrawDevelopmentSession);
  await bridge.request('WITHDRAW');
}
