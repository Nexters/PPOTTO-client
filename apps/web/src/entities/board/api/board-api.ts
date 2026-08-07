import { type paths, unwrapData, unwrapVoid } from '@ppotto/api';

import { api } from '@/shared/api/client';

import { boardFixture } from './__fixtures__/board.fixture';

export type BoardDetail = NonNullable<
  paths['/boards/{boardId}']['get']['responses']['200']['content']['application/json']['data']
>;

export type UpdateBoardLayoutInput =
  paths['/boards/{boardId}/layout']['patch']['requestBody']['content']['application/json'];

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export const boardApi = {
  list: () => unwrapData(api.GET('/boards')),
  get: (boardId: string) => {
    if (USE_MOCK) return Promise.resolve(boardFixture);
    return unwrapData(api.GET('/boards/{boardId}', { params: { path: { boardId } } }));
  },
  updateLayout: (boardId: string, input: UpdateBoardLayoutInput) => {
    if (USE_MOCK) return Promise.resolve();
    return unwrapVoid(
      api.PATCH('/boards/{boardId}/layout', { params: { path: { boardId } }, body: input }),
    );
  },
};
