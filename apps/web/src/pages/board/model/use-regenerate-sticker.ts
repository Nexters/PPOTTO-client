import { useQueryClient } from '@tanstack/react-query';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { useRegenerateStickerMutation } from '@/entities/sticker/api/sticker-mutations';

export function useRegenerateSticker(boardId: string) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useRegenerateStickerMutation();

  const regenerate = (stickerId: string, onSuccess?: () => void) => {
    mutate(stickerId, {
      onSuccess: ({ sticker }) => {
        queryClient.setQueryData(
          boardQueryKeys.detail(boardId),
          (current: BoardDetail | undefined) =>
            current
              ? {
                  ...current,
                  stickers: current.stickers.map((s) =>
                    s.id === sticker.id ? { ...s, imageUrl: sticker.imageUrl } : s,
                  ),
                }
              : current,
        );
        onSuccess?.();
      },
    });
  };

  return { regenerate, isRegenerating: isPending };
}
