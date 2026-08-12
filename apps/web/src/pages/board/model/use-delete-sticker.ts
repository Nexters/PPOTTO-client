import { useQueryClient } from '@tanstack/react-query';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { useDeleteStickerMutation } from '@/entities/sticker/api/sticker-mutations';
import { useToast } from '@/shared/ui/common/Toast';

export function useDeleteSticker(boardId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
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
        toast('스티커가 삭제되었습니다.');
        onSuccess?.();
      },
      onError: () => {
        toast('스티커 삭제에 실패했습니다.');
      },
    });
  };

  return { deleteSticker, isDeleting: isPending };
}
