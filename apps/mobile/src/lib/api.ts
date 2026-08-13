import { createApiClient } from '@ppotto/api';
import { router } from 'expo-router';

import { qaFetch } from '@/shared/lib/qa-diagnostics';

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!baseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required');
}

async function getAccessToken(forceRefresh = false) {
  const session = await import('./auth-session');
  return session.getAccessToken({ forceRefresh });
}

export const api = createApiClient({
  baseUrl,
  fetch: qaFetch,
  getToken: () => getAccessToken(),
  refreshAccessToken: () => getAccessToken(true),
  onAuthExpired: () => router.replace('/'),
});
