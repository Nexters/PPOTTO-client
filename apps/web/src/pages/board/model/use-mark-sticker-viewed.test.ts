import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/sticker/api/sticker-api', () => ({
  stickerApi: { markViewed: vi.fn().mockResolvedValue(undefined) },
}));

import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';

import { useMarkStickerViewed } from './use-mark-sticker-viewed';

function createWrapper() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe('useMarkStickerViewed', () => {
  it('성공 시 스티커 캐시의 isNew를 false로 patch한다', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(stickerQueryKeys.detail('s1'), {
      sticker: { id: 's1', isNew: true, title: '제목' },
    });

    const { result } = renderHook(() => useMarkStickerViewed('b1'), { wrapper });
    result.current.markViewed('s1');

    await waitFor(() => {
      expect(queryClient.getQueryData(stickerQueryKeys.detail('s1'))).toEqual({
        sticker: { id: 's1', isNew: false, title: '제목' },
      });
    });
  });

  it('성공 시 인자로 받은 boardId의 보드 캐시에서 해당 스티커의 isNew만 false로 patch한다', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(boardQueryKeys.detail('b1'), {
      stickers: [
        { id: 's1', isNew: true },
        { id: 's2', isNew: true },
      ],
    });

    const { result } = renderHook(() => useMarkStickerViewed('b1'), { wrapper });
    result.current.markViewed('s1');

    await waitFor(() => {
      expect(queryClient.getQueryData(boardQueryKeys.detail('b1'))).toEqual({
        stickers: [
          { id: 's1', isNew: false },
          { id: 's2', isNew: true },
        ],
      });
    });
  });

  it('보드 캐시가 아직 없어도 에러 없이 스티커 캐시는 patch된다', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(stickerQueryKeys.detail('s1'), {
      sticker: { id: 's1', isNew: true, title: '제목' },
    });

    const { result } = renderHook(() => useMarkStickerViewed('b1'), { wrapper });
    result.current.markViewed('s1');

    await waitFor(() => {
      expect(queryClient.getQueryData(stickerQueryKeys.detail('s1'))).toEqual({
        sticker: { id: 's1', isNew: false, title: '제목' },
      });
    });
    expect(queryClient.getQueryData(boardQueryKeys.detail('b1'))).toBeUndefined();
  });
});
