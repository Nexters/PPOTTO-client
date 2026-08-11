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
  it('성공 시 스티커 캐시를 무효화한다', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMarkStickerViewed('b1'), { wrapper });
    result.current.markViewed('s1');

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stickerQueryKeys.detail('s1') });
    });
  });

  it('성공 시 인자로 받은 boardId의 보드 캐시를 무효화한다', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMarkStickerViewed('b1'), { wrapper });
    result.current.markViewed('s1');

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: boardQueryKeys.detail('b1') });
    });
  });
});
