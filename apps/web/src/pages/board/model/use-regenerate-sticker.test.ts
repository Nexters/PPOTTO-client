import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/sticker/api/sticker-api', () => ({
  stickerApi: {
    regenerate: vi.fn().mockResolvedValue({ sticker: { id: 's1', imageUrl: 'new.png' } }),
  },
}));

import type { BoardDetail } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';
import { ToastProvider } from '@/shared/ui/common/Toast';

import { useRegenerateSticker } from './use-regenerate-sticker';

function createWrapper() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ToastProvider, null, children),
    );
  return { queryClient, wrapper };
}

describe('useRegenerateSticker', () => {
  it('성공 시 리캡과 보드 캐시의 이미지를 함께 갱신한다', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(stickerQueryKeys.detail('s1'), {
      sticker: { id: 's1', imageUrl: 'old.png' },
    } as StickerRecap);
    queryClient.setQueryData(boardQueryKeys.detail('b1'), {
      stickers: [{ id: 's1', imageUrl: 'old.png' }],
    } as BoardDetail);

    const { result } = renderHook(() => useRegenerateSticker('b1'), { wrapper });
    result.current.regenerate('s1');

    await waitFor(() => {
      expect(
        queryClient.getQueryData<StickerRecap>(stickerQueryKeys.detail('s1'))?.sticker.imageUrl,
      ).toBe('new.png');
      expect(
        queryClient.getQueryData<BoardDetail>(boardQueryKeys.detail('b1'))?.stickers[0]?.imageUrl,
      ).toBe('new.png');
    });
  });
});
