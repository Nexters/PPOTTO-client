import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';

import { RecapShareSheet } from './RecapShareSheet';

const request = vi.hoisted(() => vi.fn());

vi.mock('./RecapShareCard', () => ({ RecapShareCard: () => null }));
vi.mock('@/shared/ui/common/Toast', () => ({ useToast: () => vi.fn() }));
vi.mock('@/entities/user/api/user-queries', () => ({
  useMeQuery: () => ({ data: { name: '테스트' } }),
}));
vi.mock('@/shared/lib/blob-to-base64', () => ({ blobToBase64: vi.fn(() => 'image-base64') }));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { request } }));
vi.mock('@/shared/lib/compose-instagram-story-image', () => ({
  // jsdom에는 createImageBitmap이 없어 9:16 합성은 목으로 대체한다
  composeInstagramStoryImage: vi.fn((blob: Blob) => blob),
}));
vi.mock('@/shared/lib/capture-element-as-blob', () => ({
  captureElementAsBlob: vi.fn(() => new Blob()),
  captureElementAsCanvas: vi.fn(() => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(new Blob());
    return canvas;
  }),
}));
// 크롭은 캔버스 픽셀 연산이라 jsdom에서 실제로 못 그림 — 입력을 그대로 반환하는 것으로 대체
vi.mock('@/shared/lib/crop-canvas-to-square', () => ({
  cropCanvasToSquare: (canvas: HTMLCanvasElement) => canvas,
}));

const uploadImage = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ infos: { original: { url: 'https://k.kakao/image.png' } } }),
);

beforeEach(() => {
  request.mockReset();
  uploadImage.mockClear();
  window.Kakao = { Share: { uploadImage } } as unknown as Window['Kakao'];
});

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

it('카카오톡 버튼으로 업로드한 이미지 URL과 템플릿 변수를 네이티브에 전달한다', async () => {
  request.mockResolvedValue({ success: true });
  const onClose = vi.fn();
  const data = {
    sticker: { title: '고양이' },
    comments: [
      { id: 'c1', content: '귀여움', posX: null },
      { id: 'c2', content: '행복', posX: null },
      { id: 'c3', content: '말풍선', posX: 10 },
    ],
  } as StickerRecap;
  render(<RecapShareSheet isOpen onClose={onClose} stickerId="sticker-1" data={data} />);

  fireEvent.click(screen.getByRole('button', { name: '카카오톡' }));

  await waitFor(() => expect(uploadImage).toHaveBeenCalledOnce());
  expect(uploadImage.mock.calls[0]?.[0].file).toEqual([
    expect.objectContaining({ name: 'ppotto-recap.png', type: 'image/png' }),
  ]);
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith('SHARE_KAKAO', {
      templateArgs: {
        IMAGE_URL: 'https://k.kakao/image.png',
        USER_NAME: '테스트',
        STICKER_NAME: '고양이',
        KEYWORDS: '귀여움, 행복',
      },
    }),
  );
  expect(onClose).toHaveBeenCalledOnce();
});
