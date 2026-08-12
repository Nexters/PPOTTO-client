import { useQueryClient } from '@tanstack/react-query';

import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { useMarkStickerViewedMutation } from '@/entities/sticker/api/sticker-mutations';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';

export function useMarkStickerViewed(boardId: string) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMarkStickerViewedMutation();

  const markViewed = (stickerId: string) => {
    mutate(stickerId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: stickerQueryKeys.detail(stickerId) });
        queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });
      },
    });
  };

  return { markViewed, isMarkingViewed: isPending };
}
