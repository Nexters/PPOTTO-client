import { beforeEach, expect, it, vi } from 'vitest';

const openAppWithStoreFallback = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/open-app-with-store-fallback', () => ({ openAppWithStoreFallback }));

import { openBoardInvitationInApp } from './open-board-invitation-in-app';

beforeEach(() => {
  openAppWithStoreFallback.mockReset();
});

it('정규화한 초대 코드를 앱 스킴 경로로 전달한다', () => {
  openBoardInvitationInApp(' k7p2qx ');

  expect(openAppWithStoreFallback).toHaveBeenCalledWith('mobile://invitations/K7P2QX');
});
