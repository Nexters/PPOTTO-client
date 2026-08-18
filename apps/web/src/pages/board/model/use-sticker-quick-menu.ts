import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { useVisualViewportInset } from '@/shared/lib/use-visual-viewport-inset';

import { useRenameSticker } from './use-rename-sticker';

export function useStickerQuickMenu(boardId: string) {
  const [quickMenuStickerId, setQuickMenuStickerId] = useState<string | null>(null);
  const [directEditStickerId, setDirectEditStickerId] = useState<string | null>(null);
  const [directEditTitle, setDirectEditTitle] = useState('');
  const [returnToQuickMenu, setReturnToQuickMenu] = useState(false);
  const [quickMenuOpenedFromEdit, setQuickMenuOpenedFromEdit] = useState(false);
  const [isQuickMenuKeyboardSettling, setIsQuickMenuKeyboardSettling] = useState(false);
  const { rename } = useRenameSticker(boardId);
  const keyboardInset = useVisualViewportInset();
  const directEditInputElementRef = useRef<HTMLInputElement | null>(null);

  const isEditingRef = useRef(false);
  useEffect(() => {
    isEditingRef.current = quickMenuStickerId !== null || directEditStickerId !== null;
  });

  useEffect(() => {
    if (!isQuickMenuKeyboardSettling || keyboardInset > 0) return;

    const timeout = window.setTimeout(() => setIsQuickMenuKeyboardSettling(false), 350);

    return () => window.clearTimeout(timeout);
  }, [isQuickMenuKeyboardSettling, keyboardInset]);

  const openQuickMenu = (stickerId: string) => setQuickMenuStickerId(stickerId);

  const focusDirectEditInput = () => {
    directEditInputElementRef.current?.focus();
  };

  const closeQuickMenu = () => {
    setQuickMenuStickerId(null);
    setQuickMenuOpenedFromEdit(false);
    setIsQuickMenuKeyboardSettling(false);
  };

  const resetDirectEdit = () => {
    const stickerId = directEditStickerId;
    setDirectEditStickerId(null);
    setDirectEditTitle('');
    if (returnToQuickMenu && stickerId) {
      setQuickMenuStickerId(stickerId);
      setQuickMenuOpenedFromEdit(true);
      setIsQuickMenuKeyboardSettling(true);
    }
    setReturnToQuickMenu(false);
  };

  const startDirectEdit = (stickerId: string) => {
    flushSync(() => {
      setReturnToQuickMenu(false);
      setQuickMenuOpenedFromEdit(false);
      setIsQuickMenuKeyboardSettling(false);
      setDirectEditTitle('');
      setDirectEditStickerId(stickerId);
    });
    focusDirectEditInput();
  };

  const startRenameFromQuickMenu = () => {
    const stickerId = quickMenuStickerId;
    if (!stickerId) return;

    flushSync(() => {
      setQuickMenuStickerId(null);
      setReturnToQuickMenu(true);
      setQuickMenuOpenedFromEdit(false);
      setIsQuickMenuKeyboardSettling(false);
      setDirectEditTitle('');
      setDirectEditStickerId(stickerId);
    });
    focusDirectEditInput();
  };

  const submitDirectEdit = (title: string) => {
    if (directEditStickerId) {
      rename(directEditStickerId, title, () => {
        setDirectEditStickerId(null);
        setDirectEditTitle('');
        setReturnToQuickMenu(false);
        setQuickMenuOpenedFromEdit(false);
        setIsQuickMenuKeyboardSettling(false);
      });
    }
  };

  const cancelDirectEdit = () => {
    resetDirectEdit();
  };

  const finishDirectEditFromBackdrop = (originalTitle: string) => {
    const nextTitle = directEditTitle.trim();
    if (nextTitle && nextTitle !== originalTitle) submitDirectEdit(nextTitle);
    else cancelDirectEdit();
  };

  const directEditInputRef = useCallback((node: HTMLInputElement | null) => {
    directEditInputElementRef.current = node;
    node?.focus();
  }, []);

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
    quickMenuOpenedFromEdit,
    isQuickMenuKeyboardSettling,
    directEditInputRef,
    isEditingRef,
  };
}
