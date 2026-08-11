import { useQueryClient } from '@tanstack/react-query';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { useMarkStickerViewedMutation } from '@/entities/sticker/api/sticker-mutations';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';

export function useMarkStickerViewed(boardId: string) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMarkStickerViewedMutation();

  const markViewed = (stickerId: string) => {
    mutate(stickerId, {
      onSuccess: () => {
        queryClient.setQueryData(
          stickerQueryKeys.detail(stickerId),
          (current: StickerRecap | undefined) =>
            current ? { ...current, sticker: { ...current.sticker, isNew: false } } : current,
        );

        queryClient.setQueryData(
          boardQueryKeys.detail(boardId),
          (current: BoardDetail | undefined) =>
            current
              ? {
                  ...current,
                  stickers: current.stickers.map((sticker) =>
                    sticker.id === stickerId ? { ...sticker, isNew: false } : sticker,
                  ),
                }
              : current,
        );
      },
    });
  };

  return { markViewed, isMarkingViewed: isPending };
}
