import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { useRenameSticker } from './use-rename-sticker';

export function useStickerQuickMenu(boardId: string) {
  const [quickMenuStickerId, setQuickMenuStickerId] = useState<string | null>(null);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [directEditStickerId, setDirectEditStickerId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { rename } = useRenameSticker(boardId);

  const isEditingRef = useRef(false);
  useEffect(() => {
    isEditingRef.current = quickMenuStickerId !== null || directEditStickerId !== null;
  });

  const openQuickMenu = (stickerId: string) => setQuickMenuStickerId(stickerId);

  const closeQuickMenu = () => {
    setQuickMenuStickerId(null);
    setIsRenamingTitle(false);
  };

  const startRename = () => {
    // iOS 웹뷰는 readOnly input에 focus한 뒤 속성만 바꿔서는 키보드를 열지 않는다.
    flushSync(() => setIsRenamingTitle(true));
    titleInputRef.current?.focus();
  };

  const submitRename = (title: string) => {
    if (quickMenuStickerId) rename(quickMenuStickerId, title, closeQuickMenu);
  };

  const cancelRename = () => setIsRenamingTitle(false);

  const startDirectEdit = setDirectEditStickerId;

  const submitDirectEdit = (title: string) => {
    if (directEditStickerId) {
      rename(directEditStickerId, title, () => setDirectEditStickerId(null));
    }
  };

  const cancelDirectEdit = () => setDirectEditStickerId(null);

  const directEditInputRef = (node: HTMLInputElement | null) => {
    titleInputRef.current = node;
    // 클릭으로 새로 마운트되는 input이라 콜백 ref에서 마운트 즉시 focus
    node?.focus();
  };

  return {
    quickMenuStickerId,
    openQuickMenu,
    closeQuickMenu,
    isRenamingTitle,
    startRename,
    submitRename,
    cancelRename,
    directEditStickerId,
    startDirectEdit,
    submitDirectEdit,
    cancelDirectEdit,
    titleInputRef,
    directEditInputRef,
    isEditingRef,
  };
}
