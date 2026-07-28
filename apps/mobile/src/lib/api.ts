import { createApiClient } from '@ppotto/api';

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!baseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required');
}

export const api = createApiClient({ baseUrl });
