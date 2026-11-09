import type { Middleware } from 'openapi-fetch';

// ponytail: GCS 결제 계정이 막혀 이미지가 403일 때 엑박만 피하는 개발용 우회. 복구되면 플래그만 끈다
const MOCK_IMAGE = '/board/stickers/cat.png';
const GCS_URL = /https:\/\/storage\.googleapis\.com\/[^"\s]+/g;

export const replaceGcsUrls = (text: string) => text.replace(GCS_URL, MOCK_IMAGE);

export const mockImageUrlsMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return;
    return new Response(replaceGcsUrls(await response.clone().text()), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
