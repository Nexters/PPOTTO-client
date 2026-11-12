import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { subscribeBoardEvents } from '@/entities/board/api/board-event-stream';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

export function useBoardEventSync(boardId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    const subscription = subscribeBoardEvents({
      boardId,
      onEvent: (event) => {
        if (event.boardId !== boardId) return;
        void queryClient.invalidateQueries({
          queryKey: boardQueryKeys.detail(boardId),
          exact: true,
          refetchType: 'active',
        });
      },
    });
    void subscription.done.catch(() => undefined);

    return subscription.close;
  }, [boardId, queryClient]);
}
