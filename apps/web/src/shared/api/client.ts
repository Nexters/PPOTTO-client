import { createApiClient } from '@ppotto/api';

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
});
