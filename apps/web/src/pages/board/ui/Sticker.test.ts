import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearStickerImageCache,
  drawOutlinedSticker,
  preloadStickerImages,
  useStickerImage,
} from '@/shared/lib/sticker-raster';

afterEach(async () => {
  await clearStickerImageCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('drawOutlinedSticker', () => {
  it('흰 외곽선을 한 번 래스터링한 뒤 원본을 가운데에 그린다', () => {
    const targetContext = { drawImage: vi.fn() };
    const maskContext = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
    };
    const mask = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => maskContext),
    } as unknown as HTMLCanvasElement;
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(mask);
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => targetContext),
    } as unknown as HTMLCanvasElement;
    const image = { naturalWidth: 320, naturalHeight: 160 } as HTMLImageElement;

    drawOutlinedSticker(canvas, image, 160);

    expect(canvas.width).toBe(332);
    expect(canvas.height).toBe(172);
    expect(maskContext.globalCompositeOperation).toBe('source-in');
    expect(maskContext.fillStyle).toBe('#fff');
    expect(targetContext.drawImage).toHaveBeenLastCalledWith(image, 6, 6, 320, 160);

    createElement.mockRestore();
  });

  it('서명이 달라도 같은 GCS 경로는 한 번만 내려받아 영구 캐시에 저장한다', async () => {
    const match = vi.fn((_request: Request) => Promise.resolve(undefined));
    const put = vi.fn((_request: Request, _response: Response) => Promise.resolve());
    const deleteCache = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('caches', {
      open: vi.fn(() => Promise.resolve({ match, put })),
      delete: deleteCache,
    });

    const response = {
      ok: true,
      blob: vi.fn(() => Promise.resolve(new Blob(['image']))),
      clone: vi.fn(),
    } as unknown as Response;
    vi.mocked(response.clone).mockReturnValue(response);
    const fetchImage = vi.fn(() => Promise.resolve(response));
    vi.stubGlobal('fetch', fetchImage);

    const NativeURL = URL;
    class TestURL extends NativeURL {}
    Object.assign(TestURL, {
      createObjectURL: vi.fn(() => 'blob:sticker'),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('URL', TestURL);

    class TestImage extends EventTarget {
      complete = false;
      crossOrigin: string | null = null;
      naturalHeight = 100;
      naturalWidth = 100;
      private value = '';

      get src() {
        return this.value;
      }

      set src(value: string) {
        this.value = value;
        queueMicrotask(() => {
          this.complete = true;
          this.dispatchEvent(new Event('load'));
        });
      }
    }
    vi.stubGlobal('Image', TestImage);

    const first = 'https://storage.googleapis.com/ppotto/stickers/a.png?signature=one';
    const renewed = 'https://storage.googleapis.com/ppotto/stickers/a.png?signature=two';

    await preloadStickerImages([first, renewed]);
    await preloadStickerImages([renewed]);

    expect(fetchImage).toHaveBeenCalledOnce();
    expect(fetchImage).toHaveBeenCalledWith(renewed, { mode: 'cors' });
    expect(put).toHaveBeenCalledOnce();
    expect(vi.mocked(put).mock.calls[0]![0].url).toBe(
      'https://storage.googleapis.com/ppotto/stickers/a.png',
    );
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    await clearStickerImageCache();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sticker');
    expect(deleteCache).toHaveBeenCalledWith('ppotto-stickers-v1');
  });

  it('렌더와 effect 사이에 로드된 이미지도 놓치지 않는다', async () => {
    let loaded = false;

    class TestImage extends EventTarget {
      static current: TestImage | undefined;

      complete = false;
      crossOrigin: string | null = null;
      naturalHeight = 0;
      naturalWidth = 0;
      src = '';

      constructor() {
        super();
        TestImage.current = this;
      }
    }
    vi.stubGlobal('Image', TestImage);

    const src = 'https://storage.googleapis.com/ppotto/stickers/race.png';
    const preload = preloadStickerImages([src]);
    await waitFor(() => expect(TestImage.current?.src).toBe(src));

    const { result } = renderHook(() => {
      const image = useStickerImage(src);
      const current = TestImage.current;
      if (!image && !loaded && current) {
        loaded = true;
        current.complete = true;
        current.naturalHeight = 100;
        current.naturalWidth = 100;
        current.dispatchEvent(new Event('load'));
      }
      return image;
    });

    await waitFor(() => expect(result.current).toBe(TestImage.current));
    await preload;
  });
});
