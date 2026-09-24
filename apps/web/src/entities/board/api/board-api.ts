import { type components, type paths, unwrapData, unwrapVoid } from '@ppotto/api';

import { api } from '@/shared/api/client';

import { boardFixture } from './__fixtures__/board.fixture';

// 스펙은 v1|v2 유니온이지만 웹은 항상 X-API-Version: 2를 보내므로 v2 타입으로 고정한다
type BoardDetailAnyVersion =
  paths['/boards/{boardId}']['get']['responses']['200']['content']['application/json']['data'];
export type BoardDetail = components['schemas']['BoardDetailV2Response'];

export type UpdateBoardLayoutInput = components['schemas']['BoardLayoutV2Request'];

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export const boardApi = {
  list: () => {
    if (USE_MOCK) return Promise.resolve([{ id: boardFixture.id, name: boardFixture.name }]);
    return unwrapData(api.GET('/boards'));
  },
  get: (boardId: string) => {
    if (USE_MOCK) return Promise.resolve(boardFixture);
    return unwrapData<BoardDetailAnyVersion>(
      api.GET('/boards/{boardId}', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
      }),
    ) as Promise<BoardDetail>;
  },
  updateLayout: (boardId: string, input: UpdateBoardLayoutInput) => {
    if (USE_MOCK) return Promise.resolve();
    return unwrapVoid(
      api.PATCH('/boards/{boardId}/layout', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
        body: input,
      }),
    );
  },
};
