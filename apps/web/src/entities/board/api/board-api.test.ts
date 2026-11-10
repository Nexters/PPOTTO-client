import { beforeEach, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@ppotto/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ppotto/api')>()),
  unwrapData: <T>(request: Promise<T>) => request,
}));
vi.mock('@/shared/api/client', () => ({ api: { POST: post } }));
vi.mock('@/shared/api/public-client', () => ({ publicApi: {} }));

import { boardApi } from './board-api';

beforeEach(() => {
  post.mockReset();
});

it('초대 코드를 정규화해 v2 보드 참여 API를 호출한다', async () => {
  const response = {
    boardId: 'board-1',
    boardName: '제주 여행',
    role: 'MEMBER' as const,
  };
  post.mockResolvedValue(response);

  await expect(boardApi.joinInvitation(' k7p2qx ')).resolves.toEqual(response);
  expect(post).toHaveBeenCalledWith('/board-invitations/{code}/join', {
    params: {
      path: { code: 'K7P2QX' },
      header: { 'X-API-Version': '2' },
    },
  });
});
