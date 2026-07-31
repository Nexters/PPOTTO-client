import createClient, { type ClientOptions, type Middleware } from 'openapi-fetch';

import { NetworkError } from './errors.ts';
import type { paths } from './generated/schema';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  refreshAccessToken?: () => string | null | Promise<string | null>;
  onAuthExpired?: () => void | Promise<void>;
  fetch?: ClientOptions['fetch'];
}

async function isAccessTokenExpired(response: Response) {
  if (response.status !== 401) return false;

  try {
    const body = (await response.clone().json()) as { error?: { code?: unknown } };
    return body.error?.code === 'COMMON-004';
  } catch {
    return false;
  }
}

export function createApiClient({
  baseUrl,
  getToken,
  refreshAccessToken,
  onAuthExpired,
  fetch,
}: ApiClientOptions) {
  const client = createClient<paths>({ baseUrl, fetch });

  client.use({
    onError({ error }) {
      if (error instanceof Error && error.name === 'AbortError') return;
      return new NetworkError(error);
    },
  });

  if (getToken || refreshAccessToken) {
    const retryRequests = new Map<string, Request>();
    const auth: Middleware = {
      async onRequest({ id, request }) {
        const token = await getToken?.();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
        if (refreshAccessToken) retryRequests.set(id, request.clone());
        return request;
      },
      async onResponse({ id, response, options }) {
        const retryRequest = retryRequests.get(id);
        retryRequests.delete(id);
        if (!retryRequest || !refreshAccessToken || !(await isAccessTokenExpired(response))) return;

        const token = await refreshAccessToken();
        if (!token) {
          await onAuthExpired?.();
          return;
        }

        retryRequest.headers.set('Authorization', `Bearer ${token}`);
        let retriedResponse: Response;
        try {
          retriedResponse = await options.fetch(retryRequest);
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') throw error;
          throw new NetworkError(error);
        }

        if (await isAccessTokenExpired(retriedResponse)) await onAuthExpired?.();
        return retriedResponse;
      },
      onError({ id }) {
        retryRequests.delete(id);
      },
    };
    client.use(auth);
  }

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
