import { unwrapData, unwrapVoid } from '@ppotto/api';

import { api } from '@/shared/api/client';

import { stickerFixture } from './__fixtures__/sticker.fixture';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export const stickerApi = {
  get: (stickerId: string) => {
    if (USE_MOCK) return Promise.resolve(stickerFixture);
    return unwrapData(api.GET('/stickers/{stickerId}', { params: { path: { stickerId } } }));
  },
  markViewed: (stickerId: string) => {
    if (USE_MOCK) return Promise.resolve();
    return unwrapVoid(api.POST('/stickers/{stickerId}/view', { params: { path: { stickerId } } }));
  },
};
