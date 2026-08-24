import { createApiClient } from '@ppotto/api';

export const publicApi = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
});
