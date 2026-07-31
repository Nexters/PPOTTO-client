import { createApiClient } from '@ppotto/api';
import { router } from 'expo-router';

import { getAccessToken } from './auth-session';

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!baseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required');
}

export const api = createApiClient({
  baseUrl,
  getToken: getAccessToken,
  refreshAccessToken: () => getAccessToken({ forceRefresh: true }),
  onAuthExpired: () => router.replace('/'),
});
