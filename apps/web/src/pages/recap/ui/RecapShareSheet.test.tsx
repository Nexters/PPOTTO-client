import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';

import { RecapShareSheet } from './RecapShareSheet';

const request = vi.hoisted(() => vi.fn());

vi.mock('./RecapShareCard', () => ({ RecapShareCard: () => null }));
vi.mock('@/shared/ui/common/Toast', () => ({ useToast: () => vi.fn() }));
vi.mock('@/shared/lib/blob-to-base64', () => ({ blobToBase64: vi.fn(() => 'image-base64') }));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { request } }));
vi.mock('@/shared/lib/compose-instagram-story-image', () => ({
  // jsdom에는 createImageBitmap이 없어 9:16 합성은 목으로 대체한다
  composeInstagramStoryImage: vi.fn((blob: Blob) => blob),
}));
vi.mock('@/shared/lib/capture-element-as-blob', () => ({
  captureElementAsBlob: vi.fn(() => new Blob()),
}));

beforeEach(() => request.mockReset());

it('공유 설정에서 공유 옵션 화면으로 이동한다', () => {
  render(
    <RecapShareSheet isOpen onClose={vi.fn()} stickerId="sticker-1" data={{} as StickerRecap} />,
  );

  expect(screen.queryByRole('button', { name: 'X' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '공유 설정' }));
  expect(screen.getByText('공유 옵션')).toBeTruthy();
});

it('인스타그램 버튼으로 합성 이미지를 네이티브에 전달한다', async () => {
  request.mockResolvedValue({ success: true });
  const onClose = vi.fn();
  render(
    <RecapShareSheet isOpen onClose={onClose} stickerId="sticker-1" data={{} as StickerRecap} />,
  );

  fireEvent.click(screen.getByRole('button', { name: '인스타그램' }));

  await waitFor(() =>
    expect(request).toHaveBeenCalledWith('SHARE_INSTAGRAM_STORY', {
      base64: 'image-base64',
    }),
  );
  expect(onClose).toHaveBeenCalledOnce();
});
