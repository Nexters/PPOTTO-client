import { useEffect, useRef, useState } from 'react';

import { useRenameSticker } from './use-rename-sticker';

export function useStickerQuickMenu(boardId: string) {
  const [quickMenuStickerId, setQuickMenuStickerId] = useState<string | null>(null);
  const [directEditStickerId, setDirectEditStickerId] = useState<string | null>(null);
  const { rename } = useRenameSticker(boardId);

  const isEditingRef = useRef(false);
  useEffect(() => {
    isEditingRef.current = quickMenuStickerId !== null || directEditStickerId !== null;
  });

  const openQuickMenu = (stickerId: string) => setQuickMenuStickerId(stickerId);

  const closeQuickMenu = () => setQuickMenuStickerId(null);

  const startDirectEdit = setDirectEditStickerId;

  // Dialog focus trap이 바깥 input의 focus를 뺏어가는 문제 회피용 — 퀵메뉴를 먼저 닫고 편집 시작
  const startRenameFromQuickMenu = () => {
    const stickerId = quickMenuStickerId;
    closeQuickMenu();
    if (stickerId) startDirectEdit(stickerId);
  };

  const submitDirectEdit = (title: string) => {
    if (directEditStickerId) {
      rename(directEditStickerId, title, () => setDirectEditStickerId(null));
    }
  };

  const cancelDirectEdit = () => setDirectEditStickerId(null);

  // 클릭으로 새로 마운트되는 input이라 콜백 ref에서 마운트 즉시 focus해야 iOS 웹뷰가 키보드를 띄움
  const directEditInputRef = (node: HTMLInputElement | null) => node?.focus();

  return {
    quickMenuStickerId,
    openQuickMenu,
    closeQuickMenu,
    startRenameFromQuickMenu,
    directEditStickerId,
    startDirectEdit,
    submitDirectEdit,
    cancelDirectEdit,
    directEditInputRef,
    isEditingRef,
  };
}
