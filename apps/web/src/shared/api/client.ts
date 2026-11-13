import { createApiClient } from '@ppotto/api';

import { getApiAccessToken, handleApiAuthExpired } from './auth-session';
import { mockImageUrlsMiddleware } from './mock-image-urls';

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  getToken: () => getApiAccessToken(),
  refreshAccessToken: () => getApiAccessToken(true),
  onAuthExpired: handleApiAuthExpired,
});

if (process.env.NEXT_PUBLIC_MOCK_IMAGES === 'true') api.use(mockImageUrlsMiddleware);
