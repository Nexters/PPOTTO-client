import { useQueryClient } from '@tanstack/react-query';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { useDeleteStickerMutation } from '@/entities/sticker/api/sticker-mutations';

export function useDeleteSticker(boardId: string) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useDeleteStickerMutation();

  const deleteSticker = (stickerId: string, onSuccess?: () => void) => {
    mutate(stickerId, {
      onSuccess: () => {
        queryClient.setQueryData(
          boardQueryKeys.detail(boardId),
          (current: BoardDetail | undefined) =>
            current
              ? { ...current, stickers: current.stickers.filter((s) => s.id !== stickerId) }
              : current,
        );
        onSuccess?.();
      },
    });
  };

  return { deleteSticker, isDeleting: isPending };
}
