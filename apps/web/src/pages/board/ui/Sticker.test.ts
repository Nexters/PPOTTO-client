import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearStickerImageCache,
  drawOutlinedSticker,
  preloadStickerImages,
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

    await clearStickerImageCache();
    expect(deleteCache).toHaveBeenCalledWith('ppotto-stickers-v1');
  });
});
