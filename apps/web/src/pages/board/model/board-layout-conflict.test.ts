import { HttpError } from '@ppotto/api';
import { expect, it } from 'vitest';

import { boardFixture } from '@/entities/board/api/__fixtures__/board.fixture';
import type { BoardDetail, UpdateBoardLayoutInput } from '@/entities/board/api/board-api';

import {
  getBoardLayoutConflict,
  hasLayoutChanges,
  rebaseLayoutInput,
} from './board-layout-conflict';

const sticker = boardFixture.stickers[0]!;
const drawing = {
  id: 'drawing-1',
  type: 'STROKE' as const,
  scope: 'BOARD' as const,
  color: '#123456',
  zIndex: 1,
  layoutVersion: 4,
  stroke: { points: [[0, 0]] },
  strokeWidth: 2,
};
const input: UpdateBoardLayoutInput = {
  stickers: [
    {
      id: sticker.id,
      posX: 100,
      posY: 200,
      scale: 1,
      rotation: 0,
      zIndex: 1,
      badgeOffsetX: 0,
      badgeOffsetY: 0,
      badgeRotation: 0,
      expectedLayoutVersion: 2,
    },
  ],
  drawings: { deleted: [{ id: drawing.id, expectedLayoutVersion: 4 }] },
};

it('409 상세 ID와 최신 조회를 이용해 수정 충돌과 삭제 충돌을 구분한다', () => {
  const error = new HttpError(409, 'BOARD-013', {
    error: { details: { stickerIds: [sticker.id], drawingIds: [drawing.id] } },
  });
  const latest: BoardDetail = {
    ...boardFixture,
    stickers: [{ ...sticker, layoutVersion: 3 }],
    drawings: [],
  };

  expect(getBoardLayoutConflict(error, input, latest)).toEqual({
    changed: { stickerIds: [sticker.id], drawingIds: [] },
    deleted: { stickerIds: [], drawingIds: [drawing.id] },
  });
  expect(getBoardLayoutConflict(new HttpError(500, 'COMMON-000', null), input, latest)).toBeNull();
});

it('스티커에 붙은 그림은 원래 스티커가 사라지면 삭제 충돌로 분류한다', () => {
  const error = new HttpError(409, 'BOARD-013', {
    error: { details: { stickerIds: [], drawingIds: [drawing.id] } },
  });
  const latest: BoardDetail = {
    ...boardFixture,
    stickers: [],
    drawings: [{ ...drawing, scope: 'STICKER', stickerId: sticker.id }],
  };

  expect(getBoardLayoutConflict(error, input, latest)?.deleted.drawingIds).toEqual([drawing.id]);
});

it('충돌 항목을 제외하거나 최신 버전으로 다시 저장할 요청을 만든다', () => {
  const latest: BoardDetail = {
    ...boardFixture,
    stickers: [{ ...sticker, layoutVersion: 3 }],
    drawings: [{ ...drawing, layoutVersion: 5 }],
  };

  const overwrite = rebaseLayoutInput(input, latest, { stickerIds: [], drawingIds: [] });
  expect(overwrite.stickers?.[0]).toMatchObject({ posX: 100, expectedLayoutVersion: 3 });
  expect(overwrite.drawings?.deleted?.[0]).toMatchObject({ expectedLayoutVersion: 5 });

  const partial = rebaseLayoutInput(input, latest, {
    stickerIds: [sticker.id],
    drawingIds: [],
  });
  expect(partial.stickers).toEqual([]);
  expect(partial.drawings?.deleted).toHaveLength(1);

  const excluded = rebaseLayoutInput(input, latest, {
    stickerIds: [sticker.id],
    drawingIds: [drawing.id],
  });
  expect(hasLayoutChanges(excluded)).toBe(false);
});

it('텍스트 위치를 다시 저장할 때 다른 참여자가 바꾼 문구와 색은 유지한다', () => {
  const latest: BoardDetail = {
    ...boardFixture,
    drawings: [
      {
        id: 'text-1',
        type: 'TEXT',
        scope: 'BOARD',
        color: '#ffffff',
        content: '최신 문구',
        fontSize: 20,
        maxWidth: 200,
        posX: 30,
        posY: 40,
        rotation: 0,
        zIndex: 1,
        layoutVersion: 5,
      },
    ],
  };
  const moved: UpdateBoardLayoutInput = {
    drawings: {
      updated: [
        {
          id: 'text-1',
          type: 'TEXT',
          scope: 'BOARD',
          color: '#000000',
          content: '이전 문구',
          fontSize: 20,
          maxWidth: 200,
          posX: 100,
          posY: 120,
          rotation: 0,
          zindex: 1,
          expectedLayoutVersion: 4,
        },
      ],
    },
  };

  expect(
    rebaseLayoutInput(moved, latest, { stickerIds: [], drawingIds: [] }).drawings?.updated?.[0],
  ).toMatchObject({
    content: '최신 문구',
    color: '#ffffff',
    posX: 100,
    posY: 120,
    expectedLayoutVersion: 5,
  });
});
