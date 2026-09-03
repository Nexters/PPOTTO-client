import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { BoardDetail, UpdateBoardLayoutInput } from '@/entities/board/api/board-api';
import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

import type { StickerData } from '../ui/Sticker';

import { toLayoutInput } from './board-layout';
import {
  toDrawingMoveInput,
  toTextCreateInput,
  type ParsedDrawing,
  type ParsedText,
} from './board-drawing';

type StickerOverride = Partial<
  Pick<
    StickerData,
    'posX' | 'posY' | 'rotation' | 'scale' | 'badgeOffsetX' | 'badgeOffsetY' | 'zIndex'
  >
>;
type DrawingOverride = Partial<Pick<ParsedDrawing, 'points' | 'strokeWidth' | 'zIndex'>>;
type TextOverride = Partial<
  Pick<ParsedText, 'x' | 'y' | 'fontSize' | 'maxWidth' | 'rotation' | 'zIndex'>
>;

// 이동 모드 세션 동안의 스티커/그림/텍스트 변경분을 로컬에만 들고 있다가, confirm()에서 한 번에
// 저장하거나 discard()로 그냥 버릴 수 있게 한다. 서버엔 confirm() 시점에만 요청이 나간다.
// 그림과 텍스트는 백엔드에서 같은 drawings 개념이라 삭제 id 집합(deletedDrawingIds) 공유
export function useMoveSession(
  boardId: string,
  rawStickers: StickerData[],
  rawDrawings: ParsedDrawing[],
  rawTexts: ParsedText[],
) {
  const { mutate: saveLayout } = useUpdateBoardLayoutMutation();
  const queryClient = useQueryClient();

  const [stickerOverrides, setStickerOverrides] = useState<Record<string, StickerOverride>>({});
  const [drawingOverrides, setDrawingOverrides] = useState<Record<string, DrawingOverride>>({});
  const [textOverrides, setTextOverrides] = useState<Record<string, TextOverride>>({});
  const [deletedDrawingIds, setDeletedDrawingIds] = useState<ReadonlySet<string>>(new Set());

  const stickers = useMemo(
    () => rawStickers.map((sticker) => ({ ...sticker, ...stickerOverrides[sticker.id] })),
    [rawStickers, stickerOverrides],
  );
  const drawings = useMemo(
    () =>
      rawDrawings
        .filter((drawing) => !deletedDrawingIds.has(drawing.id))
        .map((drawing) => ({ ...drawing, ...drawingOverrides[drawing.id] })),
    [rawDrawings, drawingOverrides, deletedDrawingIds],
  );
  const texts = useMemo(
    () =>
      rawTexts
        .filter((text) => !deletedDrawingIds.has(text.id))
        .map((text) => ({ ...text, ...textOverrides[text.id] })),
    [rawTexts, textOverrides, deletedDrawingIds],
  );

  // confirm()이 effect/포인터 핸들러 안에서 최신값을 읽어야 해서 state와 별도로 ref에도 들고 있는다
  const stickersRef = useRef(stickers);
  const drawingsRef = useRef(drawings);
  const textsRef = useRef(texts);
  const stickerOverridesRef = useRef(stickerOverrides);
  const drawingOverridesRef = useRef(drawingOverrides);
  const textOverridesRef = useRef(textOverrides);
  const deletedDrawingIdsRef = useRef(deletedDrawingIds);
  useEffect(() => {
    stickersRef.current = stickers;
    drawingsRef.current = drawings;
    textsRef.current = texts;
    stickerOverridesRef.current = stickerOverrides;
    drawingOverridesRef.current = drawingOverrides;
    textOverridesRef.current = textOverrides;
    deletedDrawingIdsRef.current = deletedDrawingIds;
  });

  const applyStickerChange = (stickerId: string, overrides: StickerOverride) => {
    setStickerOverrides((prev) => ({
      ...prev,
      [stickerId]: { ...prev[stickerId], ...overrides },
    }));
  };

  const applyDrawingChange = (drawingId: string, overrides: DrawingOverride) => {
    setDrawingOverrides((prev) => ({
      ...prev,
      [drawingId]: { ...prev[drawingId], ...overrides },
    }));
  };

  const applyTextChange = (textId: string, overrides: TextOverride) => {
    setTextOverrides((prev) => ({
      ...prev,
      [textId]: { ...prev[textId], ...overrides },
    }));
  };

  const markDrawingDeleted = (drawingId: string) => {
    setDeletedDrawingIds((prev) => new Set(prev).add(drawingId));
  };

  // 세션 변경분을 버리고 서버 데이터로 되돌린다(취소)
  const discard = () => {
    setStickerOverrides({});
    setDrawingOverrides({});
    setTextOverrides({});
    setDeletedDrawingIds(new Set());
  };

  // 세션 변경분을 하나의 요청으로 저장하고 비운다(확정)
  const confirm = () => {
    const overrides = stickerOverridesRef.current;
    const dOverrides = drawingOverridesRef.current;
    const tOverrides = textOverridesRef.current;
    const deletedIds = deletedDrawingIdsRef.current;
    const changedDrawingIds = Object.keys(dOverrides).filter((id) => !deletedIds.has(id));
    const changedTextIds = Object.keys(tOverrides).filter((id) => !deletedIds.has(id));

    if (
      Object.keys(overrides).length === 0 &&
      changedDrawingIds.length === 0 &&
      changedTextIds.length === 0 &&
      deletedIds.size === 0
    ) {
      return;
    }

    const input: UpdateBoardLayoutInput = {};

    const changedStickers = Object.keys(overrides)
      .map((id) => stickersRef.current.find((sticker) => sticker.id === id))
      .filter((sticker): sticker is StickerData => !!sticker);
    if (changedStickers.length > 0) {
      input.stickers = toLayoutInput(changedStickers).stickers;
    }

    const changedDrawings = changedDrawingIds
      .map((id) => drawingsRef.current.find((drawing) => drawing.id === id))
      .filter((drawing): drawing is ParsedDrawing => !!drawing)
      .map((drawing) =>
        toDrawingMoveInput(drawing.id, drawing.points, {
          color: drawing.color,
          strokeWidth: drawing.strokeWidth,
          zIndex: drawing.zIndex,
        }),
      );
    const changedTexts = changedTextIds
      .map((id) => textsRef.current.find((text) => text.id === id))
      .filter((text): text is ParsedText => !!text)
      .map((text) =>
        toTextCreateInput(text.id, {
          text: text.text,
          x: text.x,
          y: text.y,
          fontSize: text.fontSize,
          maxWidth: text.maxWidth,
          zIndex: text.zIndex,
          rotation: text.rotation,
        }),
      );
    const changedItems = [...changedDrawings, ...changedTexts];
    if (changedItems.length > 0 || deletedIds.size > 0) {
      input.drawings = {
        ...(changedItems.length > 0 && { created: changedItems }),
        ...(deletedIds.size > 0 && { deletedIds: [...deletedIds] }),
      };
    }

    // 캐시(서버 데이터)에 확정된 값을 먼저 반영한다 — 이 mutation엔 onSuccess가 없어서,
    // 로컬 변경분을 지우기 전에 직접 반영해두지 않으면 확정 순간 화면이 저장 전으로 돌아가 보인다
    const changedItemsById = new Map(changedItems.map((item) => [item.id, item]));
    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current
        ? {
            ...current,
            stickers: current.stickers.map((sticker) =>
              overrides[sticker.id] ? { ...sticker, ...overrides[sticker.id] } : sticker,
            ),
            drawings: current.drawings
              .filter((drawing) => !deletedIds.has(drawing.id))
              .map((drawing) => changedItemsById.get(drawing.id) ?? drawing),
          }
        : current,
    );

    saveLayout({ boardId, input });
    discard();
  };

  return {
    stickers,
    drawings,
    texts,
    applyStickerChange,
    applyDrawingChange,
    applyTextChange,
    markDrawingDeleted,
    confirm,
    discard,
  };
}
