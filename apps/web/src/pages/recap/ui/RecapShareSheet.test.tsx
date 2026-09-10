import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';

import { RecapShareSheet } from './RecapShareSheet';

function renderSheet(props: Partial<Parameters<typeof RecapShareSheet>[0]> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RecapShareSheet
        isOpen
        onClose={vi.fn()}
        stickerId="sticker-1"
        data={{} as StickerRecap}
        {...props}
      />
    </QueryClientProvider>,
  );
}

const request = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());

vi.mock('./RecapShareCard', () => ({ RecapShareCard: () => null }));
vi.mock('@/shared/ui/common/Toast', () => ({ useToast: () => vi.fn() }));
vi.mock('@/entities/user/api/user-queries', () => ({
  useMeQuery: () => ({ data: { name: '테스트' } }),
}));
vi.mock('@/shared/lib/blob-to-base64', () => ({ blobToBase64: vi.fn(() => 'image-base64') }));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { request }, track }));
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
vi.mock('@/entities/sticker/api/sticker-api', () => ({
  stickerApi: { share: shareRecap, unshare: unshareRecap },
}));

const shareRecap = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ shareToken: 'share-token-1', includePhotos: true }),
);

const unshareRecap = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const uploadImage = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ infos: { original: { url: 'https://k.kakao/image.png' } } }),
);

beforeEach(() => {
  request.mockReset();
  track.mockClear();
  uploadImage.mockClear();
  shareRecap.mockClear();
  unshareRecap.mockClear();
  window.Kakao = { Share: { uploadImage } } as unknown as Window['Kakao'];
});

it('공유 설정에서 공유 옵션 화면으로 이동한다', () => {
  renderSheet();

  expect(screen.queryByRole('button', { name: 'X' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '공유 설정' }));
  expect(screen.getByText('공유 옵션')).toBeTruthy();
});

it('인스타그램 버튼으로 합성 이미지를 네이티브에 전달한다', async () => {
  request.mockResolvedValue({ success: true });
  const onClose = vi.fn();
  renderSheet({ onClose });

  fireEvent.click(screen.getByRole('button', { name: '인스타그램' }));

  await waitFor(() =>
    expect(request).toHaveBeenCalledWith('SHARE_INSTAGRAM_STORY', {
      base64: 'image-base64',
    }),
  );
  expect(onClose).toHaveBeenCalledOnce();
  expect(track.mock.calls).toEqual([['recap_share_clicked', { method: 'instagram' }]]);
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
  renderSheet({ onClose, data });

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
        WEB_LINK: `${window.location.origin}/share/recap/share-token-1?o=1111`,
      },
    }),
  );
  // 공유 옵션의 '테마 속 사진 포함'이 그대로 서버 공유의 사진 포함 여부가 된다
  expect(shareRecap).toHaveBeenCalledWith('sticker-1', true);
  expect(onClose).toHaveBeenCalledOnce();
});

it('공유 중이 아니면 링크 끄기 항목이 없다', () => {
  renderSheet();

  expect(screen.queryByText('공유 중인 링크 끄기')).toBeNull();
});

it('공유 중이면 링크를 끌 수 있고, 사진 포함 여부는 공유해 둔 값으로 시작한다', async () => {
  request.mockResolvedValue({ success: true });
  const onClose = vi.fn();
  const data = {
    sticker: { title: '고양이' },
    share: { photos: false },
    comments: [],
  } as unknown as StickerRecap;
  renderSheet({ onClose, data });

  fireEvent.click(screen.getByText('공유 중인 링크 끄기'));

  await waitFor(() => expect(unshareRecap).toHaveBeenCalledWith('sticker-1'));
  expect(onClose).toHaveBeenCalledOnce();
});

it('사진 없이 공유해 둔 리캡을 다시 공유해도 사진이 켜지지 않는다', async () => {
  request.mockResolvedValue({ success: true });
  const data = {
    sticker: { title: '고양이' },
    share: { photos: false },
    comments: [],
  } as unknown as StickerRecap;
  renderSheet({ data });

  fireEvent.click(screen.getByRole('button', { name: '카카오톡' }));

  await waitFor(() => expect(shareRecap).toHaveBeenCalledWith('sticker-1', false));
});
