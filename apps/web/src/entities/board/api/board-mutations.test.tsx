import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';

const { updateLayout, share, track } = vi.hoisted(() => ({
  updateLayout: vi.fn(),
  share: vi.fn(),
  track: vi.fn(),
}));
vi.mock('./board-api', () => ({ boardApi: { updateLayout, share } }));
vi.mock('@/shared/lib/bridge', () => ({ track }));

import { useShareBoardMutation, useUpdateBoardLayoutMutation } from './board-mutations';
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
