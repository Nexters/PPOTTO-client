import { HttpError } from '@ppotto/api';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { subscribeBoardEvents } from '@/entities/board/api/board-event-stream';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

export function useBoardEventSync(boardId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    let disposed = false;
    let shouldRefreshOnOpen = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let closeSubscription: (() => void) | undefined;

    const refreshBoard = () =>
      queryClient.invalidateQueries({
        queryKey: boardQueryKeys.detail(boardId),
        exact: true,
        refetchType: 'active',
      });

    const scheduleReconnect = () => {
      if (disposed || retryTimer) return;
      shouldRefreshOnOpen = true;
      const delay = reconnectDelay(retryCount);
      retryCount += 1;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        connect();
      }, delay);
    };

    const connect = () => {
      const subscription = subscribeBoardEvents({
        boardId,
        onOpen: () => {
          if (disposed) return;
          if (shouldRefreshOnOpen) void refreshBoard();
          shouldRefreshOnOpen = false;
          retryCount = 0;
        },
        onEvent: (event) => {
          if (event.boardId !== boardId) return;
          void refreshBoard();
        },
      });
      closeSubscription = subscription.close;

      void subscription.done.then(
        () => scheduleReconnect(),
        (error: unknown) => {
          if (shouldReconnect(error)) scheduleReconnect();
        },
      );
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      closeSubscription?.();
    };
  }, [boardId, queryClient]);
}

function shouldReconnect(error: unknown) {
  if (!(error instanceof HttpError)) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

function reconnectDelay(retryCount: number) {
  const exponentialDelay = Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** retryCount,
    RECONNECT_MAX_DELAY_MS,
  );
  return exponentialDelay + Math.random() * exponentialDelay * RECONNECT_JITTER_RATIO;
}

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const RECONNECT_JITTER_RATIO = 0.2;
