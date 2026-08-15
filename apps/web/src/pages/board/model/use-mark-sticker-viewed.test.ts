import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/sticker/api/sticker-api', () => ({
  stickerApi: { markViewed: vi.fn().mockResolvedValue(undefined) },
}));

import type { BoardDetail } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';

import { useMarkStickerViewed } from './use-mark-sticker-viewed';

function createWrapper() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe('useMarkStickerViewed', () => {
  it('성공 시 리캡과 보드 캐시의 새 스티커 표시를 제거한다', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(stickerQueryKeys.detail('s1'), {
      sticker: { id: 's1', isNew: true },
    } as StickerRecap);
    queryClient.setQueryData(boardQueryKeys.detail('b1'), {
      stickers: [{ id: 's1', isNew: true }],
    } as BoardDetail);

    const { result } = renderHook(() => useMarkStickerViewed('b1'), { wrapper });
    result.current.markViewed('s1');

    await waitFor(() => {
      expect(
        queryClient.getQueryData<StickerRecap>(stickerQueryKeys.detail('s1'))?.sticker.isNew,
      ).toBe(false);
      expect(
        queryClient.getQueryData<BoardDetail>(boardQueryKeys.detail('b1'))?.stickers[0]?.isNew,
      ).toBe(false);
    });
  });
});
