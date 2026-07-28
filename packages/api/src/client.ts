import createClient, { type ClientOptions, type Middleware } from 'openapi-fetch';

import { NetworkError } from './errors.ts';
import type { paths } from './generated/schema';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  fetch?: ClientOptions['fetch'];
}

export function createApiClient({ baseUrl, getToken, fetch }: ApiClientOptions) {
  const client = createClient<paths>({ baseUrl, fetch });

  client.use({
    onError({ error }) {
      if (error instanceof Error && error.name === 'AbortError') return;
      return new NetworkError(error);
    },
  });

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
