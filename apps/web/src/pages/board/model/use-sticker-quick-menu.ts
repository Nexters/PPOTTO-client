import { useEffect, useRef, useState } from 'react';

import { useVisualViewportInset } from '@/shared/lib/use-visual-viewport-inset';

import { useRenameSticker } from './use-rename-sticker';

export function useStickerQuickMenu(boardId: string) {
  const [quickMenuStickerId, setQuickMenuStickerId] = useState<string | null>(null);
  const [directEditStickerId, setDirectEditStickerId] = useState<string | null>(null);
  const [directEditTitle, setDirectEditTitle] = useState('');
  const [returnToQuickMenu, setReturnToQuickMenu] = useState(false);
  const [isReturningToQuickMenu, setIsReturningToQuickMenu] = useState(false);
  const { rename } = useRenameSticker(boardId);
  const keyboardInset = useVisualViewportInset();
  const directEditInputElementRef = useRef<HTMLInputElement | null>(null);

  const isEditingRef = useRef(false);
  useEffect(() => {
    isEditingRef.current = quickMenuStickerId !== null || directEditStickerId !== null;
  });

  useEffect(() => {
    if (!isReturningToQuickMenu || keyboardInset > 0) return;

    const frame = requestAnimationFrame(() => {
      const stickerId = directEditStickerId;
      setDirectEditStickerId(null);
      setDirectEditTitle('');
      if (stickerId) setQuickMenuStickerId(stickerId);
      setReturnToQuickMenu(false);
      setIsReturningToQuickMenu(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [directEditStickerId, isReturningToQuickMenu, keyboardInset]);

  const openQuickMenu = (stickerId: string) => setQuickMenuStickerId(stickerId);

  const closeQuickMenu = () => setQuickMenuStickerId(null);

  const resetDirectEdit = () => {
    const stickerId = directEditStickerId;
    setDirectEditStickerId(null);
    setDirectEditTitle('');
    if (returnToQuickMenu && stickerId) setQuickMenuStickerId(stickerId);
    setReturnToQuickMenu(false);
    setIsReturningToQuickMenu(false);
  };

  const startDirectEdit = (stickerId: string) => {
    setReturnToQuickMenu(false);
    setIsReturningToQuickMenu(false);
    setDirectEditTitle('');
    setDirectEditStickerId(stickerId);
  };

  const startRenameFromQuickMenu = () => {
    const stickerId = quickMenuStickerId;
    if (!stickerId) return;

    setQuickMenuStickerId(null);
    setReturnToQuickMenu(true);
    setIsReturningToQuickMenu(false);
    setDirectEditTitle('');
    setDirectEditStickerId(stickerId);
  };

  const submitDirectEdit = (title: string) => {
    if (directEditStickerId) {
      rename(directEditStickerId, title, () => {
        setDirectEditStickerId(null);
        setDirectEditTitle('');
        setReturnToQuickMenu(false);
        setIsReturningToQuickMenu(false);
      });
    }
  };

  const cancelDirectEdit = () => {
    if (returnToQuickMenu && directEditStickerId) {
      setIsReturningToQuickMenu(true);
      directEditInputElementRef.current?.blur();
      return;
    }

    resetDirectEdit();
  };

  const finishDirectEditFromBackdrop = (originalTitle: string) => {
    const nextTitle = directEditTitle.trim();
    if (nextTitle && nextTitle !== originalTitle) submitDirectEdit(nextTitle);
    else cancelDirectEdit();
  };

  const directEditInputRef = (node: HTMLInputElement | null) => {
    directEditInputElementRef.current = node;
    node?.focus();
  };

  return {
    quickMenuStickerId,
    openQuickMenu,
    closeQuickMenu,
    startRenameFromQuickMenu,
    directEditStickerId,
    startDirectEdit,
    submitDirectEdit,
    cancelDirectEdit,
    finishDirectEditFromBackdrop,
    setDirectEditTitle,
    isQuickMenuEdit: returnToQuickMenu,
    directEditInputRef,
    isEditingRef,
  };
}
