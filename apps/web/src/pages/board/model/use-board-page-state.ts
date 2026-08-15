import { useEffect } from 'react';

import { useBoardListQuery, useBoardQuery } from '@/entities/board/api/board-queries';
import { useDeleteStickersMutation } from '@/entities/sticker/api/sticker-mutations';
import { useMeQuery } from '@/entities/user/api/user-queries';
import { bridge } from '@/shared/lib/bridge';
import {
  hasCompletedFirstUpload,
  markFirstUploadCompleted,
} from '@/shared/lib/first-upload-storage';

/* 첫 업로드 여부 판단 훅 */
export function useBoardPageState() {
  const { data: boards, isLoading: isBoardListLoading } = useBoardListQuery();
  const boardId = boards?.[0]?.id;
  const { data: board, isLoading: isBoardLoading, refetch: refetchBoard } = useBoardQuery(boardId);
  const { data: me } = useMeQuery();
  const { mutate: deleteStickers, isPending: isDeletingStickers } = useDeleteStickersMutation();

  // 보드에 스티커가 생기면 첫 업로드 완료로 기록한다
  useEffect(() => {
    if (!board || !me) return;
    if (board.stickers.length > 0) markFirstUploadCompleted(me.id);
  }, [board, me]);

  const openPhotoSelect = () => {
    if (!boardId) return;
    const uploadCompleted = me ? hasCompletedFirstUpload(me.id) : false;
    bridge.send('OPEN_PHOTO_SELECT', {
      boardId,
      mode: uploadCompleted ? 'additional' : 'initial',
    });
  };

  const deleteAllStickers = () => {
    if (!board?.stickers.length) return;
    deleteStickers(
      board.stickers.map((sticker) => sticker.id),
      {
        onSettled: () => void refetchBoard(),
      },
    );
  };

  return {
    boardId,
    canDeleteStickers: Boolean(board?.stickers.length),
    deleteAllStickers,
    isDeletingStickers,
    isBoardListLoading,
    isBoardLoading,
    openPhotoSelect,
  };
}
