import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';

import { boardFixture } from '@/entities/board/api/__fixtures__/board.fixture';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

const { saveLayout } = vi.hoisted(() => ({ saveLayout: vi.fn() }));
vi.mock('@/entities/board/api/board-mutations', () => ({
  useUpdateBoardLayoutMutation: () => ({ mutate: saveLayout }),
}));

import type { StickerData } from '../ui/Sticker';

import { useMoveSession } from './use-move-session';

it('이동 모드에서 변경한 스티커, 선, 텍스트의 조회 당시 버전을 함께 저장한다', () => {
  const client = new QueryClient();
  const boardId = boardFixture.id;
  const stroke = {
    id: 'stroke-1',
    type: 'STROKE' as const,
    scope: 'BOARD' as const,
    color: '#123456',
    zIndex: 1,
    layoutVersion: 2,
    stroke: { points: [[0, 0]] },
    strokeWidth: 2,
  };
  const text = {
    id: 'text-1',
    type: 'TEXT' as const,
    scope: 'BOARD' as const,
    color: '#ABCDEF',
    zIndex: 2,
    layoutVersion: 4,
    content: '텍스트',
    posX: 10,
    posY: 20,
    fontSize: 16,
    maxWidth: 100,
    rotation: 0,
  };
  client.setQueryData(boardQueryKeys.detail(boardId), {
    ...boardFixture,
    drawings: [stroke, text],
  });
  const stickers = boardFixture.stickers.map((sticker) => ({
    ...sticker,
    posX: sticker.posX ?? 0,
    posY: sticker.posY ?? 0,
    zIndex: sticker.zIndex ?? 0,
  })) as StickerData[];
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () =>
      useMoveSession(
        boardId,
        stickers,
        [
          {
            id: stroke.id,
            points: [{ x: 0, y: 0 }],
            color: stroke.color,
            strokeWidth: 2,
            zIndex: 1,
          },
        ],
        [
          {
            id: text.id,
            text: text.content,
            x: text.posX,
            y: text.posY,
            fontSize: text.fontSize,
            maxWidth: text.maxWidth,
            zIndex: text.zIndex,
            rotation: text.rotation,
          },
        ],
      ),
    { wrapper },
  );

  act(() => {
    result.current.applyStickerChange(stickers[0]!.id, { posX: 99 });
    result.current.applyDrawingChange(stroke.id, { points: [{ x: 5, y: 6 }] });
    result.current.applyTextChange(text.id, { x: 30 });
  });
  act(() => result.current.confirm());

  const input = saveLayout.mock.lastCall?.[0].input;
  expect(input.stickers[0]).toMatchObject({
    id: stickers[0]!.id,
    posX: 99,
    expectedLayoutVersion: 0,
  });
  expect(input.drawings.updated).toEqual([
    expect.objectContaining({ id: stroke.id, expectedLayoutVersion: 2, zIndex: 1 }),
    expect.objectContaining({ id: text.id, expectedLayoutVersion: 4, color: '#ABCDEF', posX: 30 }),
  ]);
  expect(input.drawings.created).toBeUndefined();
  client.clear();
  saveLayout.mockClear();
});
