import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react';

import type { BoardDetail } from '@/entities/board/api/board-api';

import { EMPTY_BOARD_STICKER_ID } from '../ui/empty-state/EmptyBoardSticker';

import { type CameraState, computeFocusTarget } from './board-camera';
import type { StickerTransform } from './board-transform';

export const EMPTY_BOARD_STICKER_INITIAL_TRANSFORM: StickerTransform = {
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
};

type UseEmptyBoardRecenterParams = {
  container: HTMLDivElement | null;
  data: BoardDetail | undefined;
  setSelectedStickerId: Dispatch<SetStateAction<string | null>>;
  setIsEmptyBoardQuickMenuOpen: Dispatch<SetStateAction<boolean>>;
  setEmptyBoardStickerTransform: Dispatch<SetStateAction<StickerTransform>>;
  setCamera: Dispatch<SetStateAction<CameraState>>;
  requestFocus: (target: CameraState) => void;
};

// 빈 보드의 월드 원점(0, 0)을 화면 정중앙 1배율에 둔다. 최초 진입은 즉시 맞추고,
// 마지막 실제 스티커가 사라진 순간에는 기존 카메라 포커스 모션으로 이동한다.
export function useEmptyBoardRecenter({
  container,
  data,
  setSelectedStickerId,
  setIsEmptyBoardQuickMenuOpen,
  setEmptyBoardStickerTransform,
  setCamera,
  requestFocus,
}: UseEmptyBoardRecenterParams) {
  const previousStickerCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!container || !data) return;

    const stickerCount = data.stickers.length;
    const previousStickerCount = previousStickerCountRef.current;
    if (stickerCount === previousStickerCount) return;
    previousStickerCountRef.current = stickerCount;

    if (stickerCount > 0) {
      if (previousStickerCount === 0) {
        setSelectedStickerId((current) => (current === EMPTY_BOARD_STICKER_ID ? null : current));
        setIsEmptyBoardQuickMenuOpen(false);
      }
      return;
    }

    setEmptyBoardStickerTransform({ ...EMPTY_BOARD_STICKER_INITIAL_TRANSFORM });
    setSelectedStickerId((current) => (current === EMPTY_BOARD_STICKER_ID ? null : current));

    const rect = container.getBoundingClientRect();
    const targetCamera = computeFocusTarget({ scale: 1, x: 0, y: 0 }, [{ x: 0, y: 0 }], {
      width: rect.width,
      height: rect.height,
    });

    if (previousStickerCount === null) setCamera(targetCamera);
    else if (previousStickerCount > 0) requestFocus(targetCamera);
  }, [
    container,
    data,
    setSelectedStickerId,
    setIsEmptyBoardQuickMenuOpen,
    setEmptyBoardStickerTransform,
    setCamera,
    requestFocus,
  ]);
}
