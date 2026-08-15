import { useQueryClient } from '@tanstack/react-query';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { useRegenerateStickerMutation } from '@/entities/sticker/api/sticker-mutations';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';
import { useToast } from '@/shared/ui/common/Toast';

export function useRegenerateSticker(boardId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
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
        // 리캡 상세는 재생성 전 데이터라 캐시를 제거한다 — 다음에 열 때 새로 조회
        queryClient.removeQueries({ queryKey: stickerQueryKeys.detail(sticker.id) });
        toast('스티커가 다시 생성되었습니다.');
        onSuccess?.();
      },
      onError: () => {
        toast('스티커 재생성에 실패했습니다.');
      },
    });
  };

  return { regenerate, isRegenerating: isPending };
}
