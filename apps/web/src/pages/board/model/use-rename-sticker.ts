import { useQueryClient } from '@tanstack/react-query';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { useUpdateStickerTitleMutation } from '@/entities/sticker/api/sticker-mutations';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';
import { useToast } from '@/shared/ui/common/Toast';

export function useRenameSticker(boardId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { mutate, isPending } = useUpdateStickerTitleMutation();

  const rename = (stickerId: string, title: string, onSuccess?: () => void) => {
    mutate(
      { stickerId, title },
      {
        onSuccess: ({ id, title: nextTitle }) => {
          queryClient.setQueryData<StickerRecap>(stickerQueryKeys.detail(id), (current) =>
            current ? { ...current, sticker: { ...current.sticker, title: nextTitle } } : current,
          );
          queryClient.setQueryData(
            boardQueryKeys.detail(boardId),
            (current: BoardDetail | undefined) =>
              current
                ? {
                    ...current,
                    stickers: current.stickers.map((s) =>
                      s.id === id ? { ...s, title: nextTitle } : s,
                    ),
                  }
                : current,
          );
          toast('스티커 이름이 수정되었습니다.');
          onSuccess?.();
        },
        onError: () => {
          toast('스티커 이름 변경에 실패했습니다.');
        },
      },
    );
  };

  return { rename, isRenaming: isPending };
}
