import { describe, expect, it, vi } from 'vitest';

import { drawOutlinedSticker } from '@/shared/lib/sticker-raster';

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
});
