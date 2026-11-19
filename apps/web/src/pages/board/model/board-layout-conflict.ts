import { HttpError } from '@ppotto/api';

import type { BoardDetail, UpdateBoardLayoutInput } from '@/entities/board/api/board-api';

export type LayoutConflictIds = { stickerIds: string[]; drawingIds: string[] };

export type BoardLayoutConflict = {
  changed: LayoutConflictIds;
  deleted: LayoutConflictIds;
};

const emptyIds = (): LayoutConflictIds => ({ stickerIds: [], drawingIds: [] });

export function hasConflictIds(ids: LayoutConflictIds): boolean {
  return ids.stickerIds.length > 0 || ids.drawingIds.length > 0;
}

export function isBoardLayoutConflictError(error: unknown): error is HttpError {
  return error instanceof HttpError && error.status === 409 && error.code === 'BOARD-013';
}

function reportedIds(error: HttpError): LayoutConflictIds {
  const body = error.body;
  if (typeof body !== 'object' || body === null || !('error' in body)) return emptyIds();
  const payload = body.error;
  if (typeof payload !== 'object' || payload === null || !('details' in payload)) return emptyIds();
  const details = payload.details;
  if (typeof details !== 'object' || details === null) return emptyIds();
  const ids = details as Record<string, unknown>;
  return {
    stickerIds: Array.isArray(ids.stickerIds)
      ? ids.stickerIds.filter((id): id is string => typeof id === 'string')
      : [],
    drawingIds: Array.isArray(ids.drawingIds)
      ? ids.drawingIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export function getBoardLayoutConflict(
  error: unknown,
  input: UpdateBoardLayoutInput,
  latest: BoardDetail,
): BoardLayoutConflict | null {
  if (!isBoardLayoutConflictError(error)) return null;

  const reported = reportedIds(error);
  const latestStickers = new Map(latest.stickers.map((sticker) => [sticker.id, sticker]));
  const latestDrawings = new Map(latest.drawings.map((drawing) => [drawing.id, drawing]));
  const changed = emptyIds();
  const deleted = emptyIds();
  const stickers = input.stickers ?? [];
  const drawings = [...(input.drawings?.updated ?? []), ...(input.drawings?.deleted ?? [])];

  stickers.forEach((sticker) => {
    const current = latestStickers.get(sticker.id);
    if (!current) deleted.stickerIds.push(sticker.id);
    else if (
      current.layoutVersion !== sticker.expectedLayoutVersion ||
      reported.stickerIds.includes(sticker.id)
    )
      changed.stickerIds.push(sticker.id);
  });
  drawings.forEach((drawing) => {
    const current = latestDrawings.get(drawing.id);
    if (
      !current ||
      (current.scope === 'STICKER' && current.stickerId && !latestStickers.has(current.stickerId))
    )
      deleted.drawingIds.push(drawing.id);
    else if (
      current.layoutVersion !== drawing.expectedLayoutVersion ||
      reported.drawingIds.includes(drawing.id)
    )
      changed.drawingIds.push(drawing.id);
  });

  return hasConflictIds(changed) || hasConflictIds(deleted) ? { changed, deleted } : null;
}

export function rebaseLayoutInput(
  input: UpdateBoardLayoutInput,
  latest: BoardDetail,
  excluded: LayoutConflictIds,
): UpdateBoardLayoutInput {
  const excludedStickers = new Set(excluded.stickerIds);
  const excludedDrawings = new Set(excluded.drawingIds);
  const latestStickers = new Map(latest.stickers.map((sticker) => [sticker.id, sticker]));
  const latestDrawings = new Map(latest.drawings.map((drawing) => [drawing.id, drawing]));
  return {
    ...input,
    stickers: input.stickers
      ?.filter((sticker) => !excludedStickers.has(sticker.id))
      .map((sticker) => ({
        ...sticker,
        expectedLayoutVersion:
          latestStickers.get(sticker.id)?.layoutVersion ?? sticker.expectedLayoutVersion,
      })),
    drawings: input.drawings && {
      ...input.drawings,
      updated: input.drawings.updated
        ?.filter((drawing) => !excludedDrawings.has(drawing.id))
        .map((drawing) => {
          const current = latestDrawings.get(drawing.id);
          if (!current || current.type !== drawing.type) return drawing;
          if (drawing.type === 'TEXT' && current.type === 'TEXT') {
            return {
              ...drawing,
              content: current.content,
              color: current.color,
              scope: current.scope,
              stickerId: current.stickerId,
              expectedLayoutVersion: current.layoutVersion,
            };
          }
          if (drawing.type === 'STROKE' && current.type === 'STROKE') {
            return {
              ...drawing,
              color: current.color,
              scope: current.scope,
              stickerId: current.stickerId,
              stroke: { ...current.stroke, points: drawing.stroke.points },
              expectedLayoutVersion: current.layoutVersion,
            };
          }
          return drawing;
        }),
      deleted: input.drawings.deleted
        ?.filter((drawing) => !excludedDrawings.has(drawing.id))
        .map((drawing) => ({
          ...drawing,
          expectedLayoutVersion:
            latestDrawings.get(drawing.id)?.layoutVersion ?? drawing.expectedLayoutVersion,
        })),
    },
  };
}

export function hasLayoutChanges(input: UpdateBoardLayoutInput): boolean {
  return !!(
    input.stickers?.length ||
    input.drawings?.created?.length ||
    input.drawings?.updated?.length ||
    input.drawings?.deleted?.length
  );
}
