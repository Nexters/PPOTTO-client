import { beforeEach, expect, it, vi } from 'vitest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { request } }));

import { clearPendingBoardInvitation, getPostLoginDestination } from './post-login-destination';

beforeEach(() => {
  vi.clearAllMocks();
});

it('네이티브에 저장된 보드 초대 목적지를 반환한다', async () => {
  request.mockResolvedValue({ type: 'BOARD_INVITATION', code: 'K7P2QX' });

  await expect(getPostLoginDestination()).resolves.toEqual({
    type: 'BOARD_INVITATION',
    code: 'K7P2QX',
  });
});

it('구버전 앱처럼 목적지 조회를 지원하지 않으면 홈으로 폴백한다', async () => {
  request.mockRejectedValue(new Error('UNKNOWN_MESSAGE'));

  await expect(getPostLoginDestination()).resolves.toEqual({ type: 'HOME' });
});

it('pending 초대 제거를 네이티브에 요청한다', async () => {
  request.mockResolvedValue(undefined);

  await expect(clearPendingBoardInvitation()).resolves.toBeUndefined();
  expect(request).toHaveBeenCalledWith('CLEAR_PENDING_BOARD_INVITATION');
});
