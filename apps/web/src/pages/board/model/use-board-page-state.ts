import { useActivity } from '@stackflow/react';
import { useEffect, useRef, useState } from 'react';

import { useBoardListQuery, useBoardQuery } from '@/entities/board/api/board-queries';
import { useDeleteStickersMutation } from '@/entities/sticker/api/sticker-mutations';
import { useMeQuery } from '@/entities/user/api/user-queries';
import { bridge } from '@/shared/lib/bridge';

const INITIAL_UPLOAD_PROMPT_DELAY_MS = 1000;
const getFirstUploadCompletedKey = (userId: string) => `ppotto:first-upload-completed:${userId}`;

/* 첫 업로드 여부 판단 훅 */
export function useBoardPageState() {
  const { isActive } = useActivity();
  const { data: boards, isLoading: isBoardListLoading } = useBoardListQuery();
  const boardId = boards?.[0]?.id;
  const { data: board, isLoading: isBoardLoading, refetch: refetchBoard } = useBoardQuery(boardId);
  const { data: me } = useMeQuery();
  const { mutate: deleteStickers, isPending: isDeletingStickers } = useDeleteStickersMutation();
  const hasPromptedOnCurrentVisit = useRef(false);
  const [isInitialUploadModalOpen, setIsInitialUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!isActive) {
      hasPromptedOnCurrentVisit.current = false;
      return;
    }
    if (!board || !me || hasPromptedOnCurrentVisit.current) return;

    const uploadCompletedKey = getFirstUploadCompletedKey(me.id);
    if (board.stickers.length > 0) {
      localStorage.setItem(uploadCompletedKey, '1');
      return;
    }
    if (localStorage.getItem(uploadCompletedKey) === '1') return;

    const timer = setTimeout(() => {
      hasPromptedOnCurrentVisit.current = true;
      setIsInitialUploadModalOpen(true);
    }, INITIAL_UPLOAD_PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [board, isActive, me]);

  const openPhotoSelect = () => {
    if (!boardId) return;
    setIsInitialUploadModalOpen(false);
    const uploadCompleted = me
      ? localStorage.getItem(getFirstUploadCompletedKey(me.id)) === '1'
      : false;
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
    isInitialUploadModalOpen,
    setIsInitialUploadModalOpen,
    openPhotoSelect,
  };
}
