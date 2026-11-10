import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';

const { updateLayout, share, joinInvitation, leave, track } = vi.hoisted(() => ({
  updateLayout: vi.fn(),
  share: vi.fn(),
  joinInvitation: vi.fn(),
  leave: vi.fn(),
  track: vi.fn(),
}));
vi.mock('./board-api', () => ({ boardApi: { updateLayout, share, joinInvitation, leave } }));
vi.mock('@/shared/lib/bridge', () => ({ track }));

import {
  useJoinBoardInvitationMutation,
  useLeaveBoardMutation,
  useShareBoardMutation,
  useUpdateBoardLayoutMutation,
} from './board-mutations';
import { boardQueryKeys } from './board-query-keys';

it('자동 배치·실패는 제외하고 각 저장 성공마다 이벤트를 한 번 기록한다', async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retryDelay: 0 } } });
  const { result } = renderHook(useUpdateBoardLayoutMutation, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  const variables = { boardId: 'board-1', input: {} };
  updateLayout.mockResolvedValue(undefined);
  await act(() => result.current.mutateAsync(variables));
  expect(track).not.toHaveBeenCalled();
  updateLayout.mockRejectedValue(new Error('offline'));
  await act(async () => {
    await expect(
      result.current.mutateAsync({
        ...variables,
        analytics: [['board_text_edit_completed', { action: 'create' }]],
      }),
    ).rejects.toThrow('offline');
  });
  expect(track).not.toHaveBeenCalled();
  updateLayout.mockResolvedValue(undefined);
  act(() => {
    result.current.mutate({
      ...variables,
      analytics: [['board_text_edit_completed', { action: 'create' }]],
    });
    result.current.mutate({
      ...variables,
      analytics: [['board_drawing_edit_completed', { action: 'delete' }]],
    });
  });
  await waitFor(() => expect(track).toHaveBeenCalledTimes(2));
  expect(updateLayout).toHaveBeenLastCalledWith('board-1', {});
  client.clear();
});

it('공유 범위를 저장하면 내 공유 상태 캐시를 응답으로 바꾼다', async () => {
  const client = new QueryClient();
  client.setQueryData(boardQueryKeys.shareStatus('board-1'), { shareToken: null, scope: 'RECAP' });
  const { result } = renderHook(useShareBoardMutation, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  share.mockResolvedValue({ shareToken: 'token-1', scope: 'PHOTOS' });

  await act(() => result.current.mutateAsync({ boardId: 'board-1', scope: 'PHOTOS' }));

  expect(share).toHaveBeenCalledWith('board-1', 'PHOTOS');
  expect(client.getQueryData(boardQueryKeys.shareStatus('board-1'))).toEqual({
    shareToken: 'token-1',
    scope: 'PHOTOS',
  });
  client.clear();
});

it('보드 참여에 성공하면 참여로 달라지는 캐시를 갱신한다', async () => {
  const client = new QueryClient();
  const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
  joinInvitation.mockResolvedValue({
    boardId: 'board-1',
    boardName: '제주 여행',
    role: 'MEMBER',
  });
  const { result } = renderHook(useJoinBoardInvitationMutation, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

  await act(() => result.current.mutateAsync({ code: ' k7p2qx ' }));

  expect(joinInvitation).toHaveBeenCalledWith(' k7p2qx ');
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: boardQueryKeys.summaryList() });
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: boardQueryKeys.detail('board-1') });
  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: boardQueryKeys.participants('board-1'),
  });
  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: boardQueryKeys.invitation('K7P2QX'),
  });
  client.clear();
});

it('보드에서 나가면 접근할 수 없는 캐시를 제거하고 목록을 갱신한다', async () => {
  const client = new QueryClient();
  const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
  client.setQueryData(boardQueryKeys.detail('board-1'), { id: 'board-1' });
  client.setQueryData(boardQueryKeys.participants('board-1'), { participantCount: 2 });
  client.setQueryData(boardQueryKeys.shareStatus('board-1'), { shareToken: 'token-1' });
  leave.mockResolvedValue(undefined);
  const { result } = renderHook(useLeaveBoardMutation, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

  await act(() => result.current.mutateAsync('board-1'));

  expect(leave).toHaveBeenCalledWith('board-1');
  expect(client.getQueryData(boardQueryKeys.detail('board-1'))).toBeUndefined();
  expect(client.getQueryData(boardQueryKeys.participants('board-1'))).toBeUndefined();
  expect(client.getQueryData(boardQueryKeys.shareStatus('board-1'))).toBeUndefined();
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: boardQueryKeys.summaryList() });
  client.clear();
});

it('보드 참여를 시작한 화면이 사라져도 완료 핸들러를 실행한다', async () => {
  const client = new QueryClient();
  const onSuccess = vi.fn();
  let resolveJoin!: (value: { boardId: string; boardName: string; role: 'MEMBER' }) => void;
  joinInvitation.mockReturnValue(
    new Promise((resolve) => {
      resolveJoin = resolve;
    }),
  );
  const { result, unmount } = renderHook(() => useJoinBoardInvitationMutation({ onSuccess }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

  act(() => result.current.mutate({ code: 'K7P2QX' }));
  unmount();
  resolveJoin({ boardId: 'board-1', boardName: '제주 여행', role: 'MEMBER' });

  await waitFor(() =>
    expect(onSuccess).toHaveBeenCalledWith({
      boardId: 'board-1',
      boardName: '제주 여행',
      role: 'MEMBER',
    }),
  );
  client.clear();
});
