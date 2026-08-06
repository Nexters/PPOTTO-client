import { useActivity } from '@stackflow/react';
import { useEffect, useRef, useState } from 'react';

import { useBoardListQuery, useBoardQuery } from '@/entities/board/api/board-queries';
import { useMeQuery } from '@/entities/user/api/user-queries';
import { bridge } from '@/shared/lib/bridge';

const INITIAL_UPLOAD_PROMPT_DELAY_MS = 1000;

/* 첫 업로드 여부 판단 훅 */
export function useBoardPageState() {
  const { isActive } = useActivity();
  const { data: boards, isLoading: isBoardListLoading } = useBoardListQuery();
  const boardId = boards?.[0]?.id;
  const { data: board } = useBoardQuery(boardId);
  const { data: me } = useMeQuery();
  const hasPromptedOnCurrentVisit = useRef(false);
  const [isInitialUploadModalOpen, setIsInitialUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!isActive) {
      hasPromptedOnCurrentVisit.current = false;
      return;
    }
    if (!board || !me || hasPromptedOnCurrentVisit.current) return;

    const uploadCompletedKey = `ppotto:first-upload-completed:${me.id}`;
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

  const confirmInitialUpload = () => {
    setIsInitialUploadModalOpen(false);
    bridge.send('OPEN_PHOTO_SELECT');
  };

  return {
    boardId,
    isBoardListLoading,
    isInitialUploadModalOpen,
    setIsInitialUploadModalOpen,
    confirmInitialUpload,
  };
}
