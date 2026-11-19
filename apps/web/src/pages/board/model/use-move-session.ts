import { useQueryClient } from '@tanstack/react-query';
import type { AnalyticsTrackArgs } from '@ppotto/bridge';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  boardApi,
  type BoardDetail,
  type UpdateBoardLayoutInput,
} from '@/entities/board/api/board-api';
import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

import type { StickerData } from '../ui/Sticker';

import { toLayoutInput } from './board-layout';
import {
  isStrokeDrawing,
  isTextDrawing,
  toDrawingUpdateInput,
  toTextUpdateInput,
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
  onSaveError?: (error: Error) => void,
  onSaveStateChange?: (isSaving: boolean) => void,
) {
  const { mutateAsync: saveLayout } = useUpdateBoardLayoutMutation();
  const queryClient = useQueryClient();

  const [stickerOverrides, setStickerOverrides] = useState<Record<string, StickerOverride>>({});
  const [drawingOverrides, setDrawingOverrides] = useState<Record<string, DrawingOverride>>({});
  const [textOverrides, setTextOverrides] = useState<Record<string, TextOverride>>({});
  const [deletedDrawingIds, setDeletedDrawingIds] = useState<ReadonlySet<string>>(new Set());
  const [stickerBases, setStickerBases] = useState(() => new Map<string, StickerData>());
  const [drawingBases, setDrawingBases] = useState(() => new Map<string, ParsedDrawing>());
  const [textBases, setTextBases] = useState(() => new Map<string, ParsedText>());
  const originalDrawings = useRef(new Map<string, BoardDetail['drawings'][number]>());
  const isSaving = useRef(false);

  const rememberDrawing = (id: string) => {
    const original = queryClient
      .getQueryData<BoardDetail>(boardQueryKeys.detail(boardId))
      ?.drawings.find((item) => item.id === id);
    if (original && !originalDrawings.current.has(id)) originalDrawings.current.set(id, original);
  };

  const stickers = useMemo(
    () => [
      ...rawStickers.map((sticker) => ({
        ...(stickerBases.get(sticker.id) ?? sticker),
        ...stickerOverrides[sticker.id],
      })),
      ...[...stickerBases.values()]
        .filter((sticker) => !rawStickers.some((item) => item.id === sticker.id))
        .map((sticker) => ({ ...sticker, ...stickerOverrides[sticker.id] })),
    ],
    [rawStickers, stickerOverrides, stickerBases],
  );
  const drawings = useMemo(
    () =>
      [
        ...rawDrawings.map((drawing) => drawingBases.get(drawing.id) ?? drawing),
        ...[...drawingBases.values()].filter(
          (drawing) => !rawDrawings.some((item) => item.id === drawing.id),
        ),
      ]
        .filter((drawing) => !deletedDrawingIds.has(drawing.id))
        .map((drawing) => ({ ...drawing, ...drawingOverrides[drawing.id] })),
    [rawDrawings, drawingOverrides, deletedDrawingIds, drawingBases],
  );
  const texts = useMemo(
    () =>
      [
        ...rawTexts.map((text) => textBases.get(text.id) ?? text),
        ...[...textBases.values()].filter((text) => !rawTexts.some((item) => item.id === text.id)),
      ]
        .filter((text) => !deletedDrawingIds.has(text.id))
        .map((text) => ({ ...text, ...textOverrides[text.id] })),
    [rawTexts, textOverrides, deletedDrawingIds, textBases],
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
    const original = stickersRef.current.find((item) => item.id === stickerId);
    if (original)
      setStickerBases((prev) =>
        prev.has(stickerId) ? prev : new Map(prev).set(stickerId, original),
      );
    setStickerOverrides((prev) => ({
      ...prev,
      [stickerId]: { ...prev[stickerId], ...overrides },
    }));
  };

  const applyDrawingChange = (drawingId: string, overrides: DrawingOverride) => {
    const original = drawingsRef.current.find((item) => item.id === drawingId);
    if (original)
      setDrawingBases((prev) =>
        prev.has(drawingId) ? prev : new Map(prev).set(drawingId, original),
      );
    rememberDrawing(drawingId);
    setDrawingOverrides((prev) => ({
      ...prev,
      [drawingId]: { ...prev[drawingId], ...overrides },
    }));
  };

  const applyTextChange = (textId: string, overrides: TextOverride) => {
    const original = textsRef.current.find((item) => item.id === textId);
    if (original)
      setTextBases((prev) => (prev.has(textId) ? prev : new Map(prev).set(textId, original)));
    rememberDrawing(textId);
    setTextOverrides((prev) => ({
      ...prev,
      [textId]: { ...prev[textId], ...overrides },
    }));
  };

  const markDrawingDeleted = (drawingId: string) => {
    const drawing = drawingsRef.current.find((item) => item.id === drawingId);
    const text = textsRef.current.find((item) => item.id === drawingId);
    if (drawing)
      setDrawingBases((prev) =>
        prev.has(drawingId) ? prev : new Map(prev).set(drawingId, drawing),
      );
    if (text)
      setTextBases((prev) => (prev.has(drawingId) ? prev : new Map(prev).set(drawingId, text)));
    rememberDrawing(drawingId);
    setDeletedDrawingIds((prev) => new Set(prev).add(drawingId));
  };

  // 세션 변경분을 버리고 서버 데이터로 되돌린다(취소)
  const discard = () => {
    setStickerBases(new Map());
    setDrawingBases(new Map());
    setTextBases(new Map());
    originalDrawings.current.clear();
    setStickerOverrides({});
    setDrawingOverrides({});
    setTextOverrides({});
    setDeletedDrawingIds(new Set());
  };

  const confirm = async (): Promise<boolean> => {
    if (isSaving.current) return false;
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
      return true;
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
      .flatMap((drawing) => {
        const original = originalDrawings.current.get(drawing.id);
        return original && isStrokeDrawing(original)
          ? [
              toDrawingUpdateInput(original, {
                points: drawing.points,
                strokeWidth: drawing.strokeWidth,
                zIndex: drawing.zIndex,
              }),
            ]
          : [];
      });
    const changedTexts = changedTextIds
      .map((id) => textsRef.current.find((text) => text.id === id))
      .filter((text): text is ParsedText => !!text)
      .flatMap((text) => {
        const original = originalDrawings.current.get(text.id);
        return original && isTextDrawing(original)
          ? [
              toTextUpdateInput(original, {
                text: text.text,
                x: text.x,
                y: text.y,
                fontSize: text.fontSize,
                maxWidth: text.maxWidth,
                zIndex: text.zIndex,
                rotation: text.rotation,
              }),
            ]
          : [];
      });
    const changedItems = [...changedDrawings, ...changedTexts];
    const deleted = [...deletedIds].flatMap((id) => {
      const original = originalDrawings.current.get(id);
      return original ? [{ id, expectedLayoutVersion: original.layoutVersion }] : [];
    });
    if (
      changedStickers.length !== Object.keys(overrides).length ||
      changedDrawings.length !== changedDrawingIds.length ||
      changedTexts.length !== changedTextIds.length ||
      deleted.length !== deletedIds.size
    ) {
      void queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });
      onSaveError?.(new Error('편집 중인 항목을 찾지 못했어요'));
      return false;
    }
    if (changedItems.length > 0 || deleted.length > 0) {
      input.drawings = {
        ...(changedItems.length > 0 && { updated: changedItems }),
        ...(deleted.length > 0 && { deleted }),
      };
    }

    const analytics: AnalyticsTrackArgs[] = [];
    changedStickers.forEach((sticker) => {
      const previous = rawStickers.find((item) => item.id === sticker.id);
      // 선택만 해 zIndex가 바뀐 경우는 변형으로 세지 않는다.
      if (
        previous &&
        ['posX', 'posY', 'rotation', 'scale', 'badgeOffsetX', 'badgeOffsetY'].some(
          (key) => previous[key as keyof StickerData] !== sticker[key as keyof StickerData],
        )
      )
        analytics.push(['sticker_edit_completed', { edit_type: 'transform' }]);
    });
    changedDrawingIds.forEach((id) => {
      const previous = rawDrawings.find((drawing) => drawing.id === id);
      if (
        previous &&
        Object.entries(dOverrides[id]!).some(
          ([key, value]) =>
            key !== 'zIndex' &&
            JSON.stringify(value) !== JSON.stringify(Reflect.get(previous, key)),
        )
      ) {
        analytics.push(['board_drawing_edit_completed', { action: 'transform' }]);
      }
    });
    changedTextIds.forEach((id) => {
      const previous = rawTexts.find((text) => text.id === id);
      if (
        previous &&
        Object.entries(tOverrides[id]!).some(
          ([key, value]) => key !== 'zIndex' && value !== Reflect.get(previous, key),
        )
      ) {
        analytics.push(['board_text_edit_completed', { action: 'transform' }]);
      }
    });
    deletedIds.forEach((id) => {
      if (rawTexts.some((text) => text.id === id))
        analytics.push(['board_text_edit_completed', { action: 'delete' }]);
      else if (rawDrawings.some((drawing) => drawing.id === id))
        analytics.push(['board_drawing_edit_completed', { action: 'delete' }]);
    });
    isSaving.current = true;
    onSaveStateChange?.(true);
    try {
      await saveLayout({ boardId, input, analytics });
    } catch (error) {
      onSaveError?.(error instanceof Error ? error : new Error('보드 배치를 저장하지 못했어요'));
      isSaving.current = false;
      onSaveStateChange?.(false);
      return false;
    }
    try {
      await queryClient.cancelQueries({ queryKey: boardQueryKeys.detail(boardId), exact: true });
      await queryClient.fetchQuery({
        queryKey: boardQueryKeys.detail(boardId),
        queryFn: () => boardApi.get(boardId),
        staleTime: 0,
        retry: false,
      });
    } catch {
      const changedItemsById = new Map(changedItems.map((item) => [item.id, item]));
      queryClient.setQueryData(
        boardQueryKeys.detail(boardId),
        (current: BoardDetail | undefined) =>
          current
            ? {
                ...current,
                stickers: current.stickers.map((sticker) =>
                  overrides[sticker.id]
                    ? {
                        ...sticker,
                        ...overrides[sticker.id],
                        layoutVersion:
                          (stickerBases.get(sticker.id)?.layoutVersion ?? sticker.layoutVersion) +
                          1,
                      }
                    : sticker,
                ),
                drawings: current.drawings
                  .filter((drawing) => !deletedIds.has(drawing.id))
                  .map((drawing) => {
                    const updated = changedItemsById.get(drawing.id);
                    return updated
                      ? { ...drawing, ...updated, layoutVersion: updated.expectedLayoutVersion + 1 }
                      : drawing;
                  }),
              }
            : current,
      );
      void queryClient.invalidateQueries({
        queryKey: boardQueryKeys.detail(boardId),
        exact: true,
        refetchType: 'none',
      });
    }
    discard();
    isSaving.current = false;
    onSaveStateChange?.(false);
    return true;
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
