import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

const { subscribeBoardEvents } = vi.hoisted(() => ({ subscribeBoardEvents: vi.fn() }));
vi.mock('@/entities/board/api/board-event-stream', () => ({ subscribeBoardEvents }));

import type { BoardLayoutUpdatedEvent } from '@/entities/board/api/board-event-stream';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

import { useBoardEventSync } from './use-board-event-sync';

function createSubscription() {
  return { close: vi.fn(), done: new Promise<void>(() => undefined) };
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const boardEvent = (boardId: string): BoardLayoutUpdatedEvent => ({
  eventId: 'event-1',
  type: 'BOARD_LAYOUT_UPDATED',
  boardId,
  occurredAt: '2026-11-13T00:00:00Z',
});

afterEach(() => {
  vi.clearAllMocks();
});

it('현재 보드 이벤트를 받으면 활성 상세 쿼리를 다시 조회한다', () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  subscribeBoardEvents.mockReturnValue(createSubscription());
  renderHook(() => useBoardEventSync('board-1'), { wrapper: createWrapper(queryClient) });
  const { onEvent } = subscribeBoardEvents.mock.calls[0]?.[0];

  act(() => onEvent(boardEvent('board-1')));

  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: boardQueryKeys.detail('board-1'),
    exact: true,
    refetchType: 'active',
  });
  queryClient.clear();
});

it('현재 보드와 다른 이벤트는 반영하지 않는다', () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  subscribeBoardEvents.mockReturnValue(createSubscription());
  renderHook(() => useBoardEventSync('board-1'), { wrapper: createWrapper(queryClient) });
  const { onEvent } = subscribeBoardEvents.mock.calls[0]?.[0];

  act(() => onEvent(boardEvent('board-2')));

  expect(invalidateQueries).not.toHaveBeenCalled();
  queryClient.clear();
});

it('보드가 바뀌거나 화면이 사라지면 이전 구독을 종료한다', () => {
  const queryClient = new QueryClient();
  const first = createSubscription();
  const second = createSubscription();
  subscribeBoardEvents.mockReturnValueOnce(first).mockReturnValueOnce(second);
  const { rerender, unmount } = renderHook(({ boardId }) => useBoardEventSync(boardId), {
    initialProps: { boardId: 'board-1' },
    wrapper: createWrapper(queryClient),
  });

  rerender({ boardId: 'board-2' });
  expect(first.close).toHaveBeenCalledOnce();
  expect(subscribeBoardEvents).toHaveBeenLastCalledWith({
    boardId: 'board-2',
    onEvent: expect.any(Function),
  });

  unmount();
  expect(second.close).toHaveBeenCalledOnce();
  queryClient.clear();
});
