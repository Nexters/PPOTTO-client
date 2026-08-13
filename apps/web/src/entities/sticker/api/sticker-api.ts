import { type paths, unwrapData, unwrapVoid } from '@ppotto/api';

import { api } from '@/shared/api/client';

import { stickerFixture } from './__fixtures__/sticker.fixture';

export type StickerRecap = NonNullable<
  paths['/stickers/{stickerId}']['get']['responses']['200']['content']['application/json']['data']
>;
export type StickerComment = StickerRecap['comments'][number];
export type StickerPhoto = StickerRecap['photos'][number];

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
  regenerate: (stickerId: string) => {
    if (USE_MOCK) return Promise.resolve(stickerFixture);
    return unwrapData(
      api.POST('/stickers/{stickerId}/regenerate', { params: { path: { stickerId } } }),
    );
  },
  delete: (stickerId: string) => {
    if (USE_MOCK) return Promise.resolve();
    return unwrapVoid(api.DELETE('/stickers/{stickerId}', { params: { path: { stickerId } } }));
  },
  updateTitle: (stickerId: string, title: string) => {
    if (USE_MOCK) return Promise.resolve({ id: stickerId, title });
    return unwrapData(
      api.PATCH('/stickers/{stickerId}', { params: { path: { stickerId } }, body: { title } }),
    );
  },
};
