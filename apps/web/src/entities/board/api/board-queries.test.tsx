import { HttpError } from '@ppotto/api';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

const { getInvitation, getParticipants } = vi.hoisted(() => ({
  getInvitation: vi.fn(),
  getParticipants: vi.fn(),
}));
vi.mock('./board-api', () => ({ boardApi: { getInvitation, getParticipants } }));

import {
  shouldRetryBoardQuery,
  useBoardInvitationQuery,
  useBoardParticipantsQuery,
} from './board-queries';
import { boardQueryKeys } from './board-query-keys';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

afterEach(() => {
  vi.clearAllMocks();
});

it('보드가 없다는 404 응답은 다시 시도하지 않는다', () => {
  expect(shouldRetryBoardQuery(0, new HttpError(404, 'BOARD-002', null))).toBe(false);
});

it('그 밖의 실패는 3번까지 다시 시도한다', () => {
  const serverError = new HttpError(500, 'COMMON-000', null);

  expect(shouldRetryBoardQuery(2, serverError)).toBe(true);
  expect(shouldRetryBoardQuery(3, serverError)).toBe(false);
});

it('보드 ID를 포함한 참여자 Query Key를 생성한다', () => {
  expect(boardQueryKeys.participants('board-1')).toEqual(['board', 'participants', 'board-1']);
});

it('활성화되면 해당 보드의 참여자 목록을 조회한다', async () => {
  const participants = {
    participantCount: 1,
    maxParticipantCount: 8,
    participants: [],
  };
  getParticipants.mockResolvedValue(participants);
  const { queryClient, wrapper } = createWrapper();

  const { result } = renderHook(() => useBoardParticipantsQuery('board-1'), { wrapper });

  await waitFor(() => expect(result.current.data).toBe(participants));
  expect(getParticipants).toHaveBeenCalledWith('board-1');
  queryClient.clear();
});

it('보드 ID가 없거나 비활성화되면 참여자 목록을 조회하지 않는다', () => {
  const first = createWrapper();
  const second = createWrapper();

  renderHook(() => useBoardParticipantsQuery(undefined), { wrapper: first.wrapper });
  renderHook(() => useBoardParticipantsQuery('board-1', false), { wrapper: second.wrapper });

  expect(getParticipants).not.toHaveBeenCalled();
  first.queryClient.clear();
  second.queryClient.clear();
});

it('초대 코드를 포함한 Query Key를 생성한다', () => {
  expect(boardQueryKeys.invitation('K7P2QX')).toEqual(['board', 'invitation', 'K7P2QX']);
});

it('6자리 초대 코드를 정규화해 초대 정보를 조회한다', async () => {
  const invitation = {
    boardId: 'board-1',
    boardName: '제주 여행',
    code: 'K7P2QX',
    expiresAt: '2026-12-09T00:00:00Z',
    inviterName: '김용희',
    maxParticipantCount: 8,
    participantCount: 2,
    stickerCount: 9,
  };
  getInvitation.mockResolvedValue(invitation);
  const { queryClient, wrapper } = createWrapper();

  const { result } = renderHook(() => useBoardInvitationQuery(' k7p2qx '), { wrapper });

  await waitFor(() => expect(result.current.data).toBe(invitation));
  expect(getInvitation).toHaveBeenCalledWith('K7P2QX');
  queryClient.clear();
});

it('초대 코드가 없거나 6자리가 아니거나 비활성화되면 조회하지 않는다', () => {
  const first = createWrapper();
  const second = createWrapper();
  const third = createWrapper();

  renderHook(() => useBoardInvitationQuery(undefined), { wrapper: first.wrapper });
  renderHook(() => useBoardInvitationQuery('ABC'), { wrapper: second.wrapper });
  renderHook(() => useBoardInvitationQuery('K7P2QX', false), { wrapper: third.wrapper });

  expect(getInvitation).not.toHaveBeenCalled();
  first.queryClient.clear();
  second.queryClient.clear();
  third.queryClient.clear();
});
