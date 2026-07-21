import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './generated/schema';

export interface ApiClientOptions {
  baseUrl: string;
  /** 인증 토큰 공급자. web은 세션에서, RN은 네이티브 저장소에서 주입. */
  getToken?: () => string | null | Promise<string | null>;
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  const client = createClient<paths>({ baseUrl });

  if (getToken) {
    const auth: Middleware = {
      async onRequest({ request }) {
        const token = await getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
        return request;
      },
    };
    client.use(auth);
  }

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
