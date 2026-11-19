import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';

import { boardFixture } from '@/entities/board/api/__fixtures__/board.fixture';
import { boardApi } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

const { saveLayout } = vi.hoisted(() => ({ saveLayout: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/entities/board/api/board-mutations', () => ({
  useUpdateBoardLayoutMutation: () => ({ mutateAsync: saveLayout }),
}));

import type { StickerData } from '../ui/Sticker';

import { useMoveSession } from './use-move-session';

it('이동 모드에서 변경한 스티커, 선, 텍스트의 조회 당시 버전을 함께 저장한다', async () => {
  const getBoard = vi.spyOn(boardApi, 'get').mockResolvedValue(boardFixture);
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
  client.setQueryData(boardQueryKeys.detail(boardId), {
    ...boardFixture,
    drawings: [
      { ...stroke, layoutVersion: 3 },
      { ...text, layoutVersion: 5 },
    ],
  });
  const saved = await act(async () => result.current.confirm());
  expect(saved).toBe(true);

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
  getBoard.mockRestore();
});

it('저장 중 원격 변경을 받아도 최초 버전과 로컬 편집을 보존하고 실패하면 다시 편집할 수 있다', async () => {
  const client = new QueryClient();
  const boardId = boardFixture.id;
  const original = {
    ...boardFixture.stickers[0]!,
    posX: 10,
    posY: 20,
    zIndex: 1,
    layoutVersion: 3,
  } as StickerData;
  const onSaveError = vi.fn();
  const error = new Error('conflict');
  saveLayout.mockRejectedValueOnce(error);
  client.setQueryData(boardQueryKeys.detail(boardId), { ...boardFixture, stickers: [original] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, rerender } = renderHook(
    ({ sticker }) => useMoveSession(boardId, [sticker], [], [], onSaveError),
    { initialProps: { sticker: original }, wrapper },
  );

  act(() => result.current.applyStickerChange(original.id, { posX: 99 }));
  const remote = { ...original, posX: 50, layoutVersion: 4 };
  client.setQueryData(boardQueryKeys.detail(boardId), { ...boardFixture, stickers: [remote] });
  rerender({ sticker: remote });
  expect(result.current.stickers[0]).toMatchObject({ posX: 99, layoutVersion: 3 });

  const saved = await act(async () => result.current.confirm());
  expect(saved).toBe(false);
  expect(saveLayout.mock.lastCall?.[0].input.stickers[0]).toMatchObject({
    posX: 99,
    expectedLayoutVersion: 3,
  });
  expect(onSaveError).toHaveBeenCalledWith(error);
  expect(result.current.stickers[0]?.posX).toBe(99);
  act(() => result.current.applyStickerChange(original.id, { posX: 100 }));
  expect(result.current.stickers[0]?.posX).toBe(100);
  client.clear();
  saveLayout.mockClear();
});

it('저장 응답 전에는 편집 내용을 유지하고 중복 요청을 보내지 않는다', async () => {
  const client = new QueryClient();
  const boardId = boardFixture.id;
  const original = {
    ...boardFixture.stickers[0]!,
    posX: 10,
    posY: 20,
    zIndex: 1,
    layoutVersion: 2,
  } as StickerData;
  let completeSave: (() => void) | undefined;
  saveLayout.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        completeSave = resolve;
      }),
  );
  const getBoard = vi.spyOn(boardApi, 'get').mockResolvedValue({
    ...boardFixture,
    stickers: [{ ...boardFixture.stickers[0]!, posX: 99, layoutVersion: 3 }],
  });
  const onSaveStateChange = vi.fn();
  client.setQueryData(boardQueryKeys.detail(boardId), { ...boardFixture, stickers: [original] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, rerender } = renderHook(
    ({ sticker }) => useMoveSession(boardId, [sticker], [], [], undefined, onSaveStateChange),
    { initialProps: { sticker: original }, wrapper },
  );

  act(() => result.current.applyStickerChange(original.id, { posX: 99 }));
  let saving: Promise<boolean> | undefined;
  act(() => {
    saving = result.current.confirm();
  });
  expect(onSaveStateChange).toHaveBeenCalledWith(true);
  expect(result.current.stickers[0]?.posX).toBe(99);
  await act(async () => result.current.confirm());
  expect(saveLayout).toHaveBeenCalledTimes(1);

  await act(async () => {
    completeSave?.();
    await saving;
  });
  rerender({ sticker: { ...original, posX: 99, layoutVersion: 3 } });
  expect(result.current.stickers[0]).toMatchObject({ posX: 99, layoutVersion: 3 });
  expect(onSaveStateChange).toHaveBeenLastCalledWith(false);
  getBoard.mockRestore();
  client.clear();
  saveLayout.mockClear();
});
