import { describe, expect, it, vi } from 'vitest';

const toCanvas = vi.hoisted(() => vi.fn());

vi.mock('html-to-image', () => ({ toCanvas }));

import { saveRecapImage } from './save-recap-image';

describe('saveRecapImage', () => {
  it('엘리먼트를 캡처해 Blob으로 변환한다', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(new Blob(['fake']));
    toCanvas.mockResolvedValue(canvas);
    const element = document.createElement('div');

    const result = await saveRecapImage(element);

    expect(result).toBeInstanceOf(Blob);
  });

  it('모든 이미지의 디코딩이 끝난 뒤 캡처한다', async () => {
    toCanvas.mockClear();
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(new Blob(['fake']));
    toCanvas.mockResolvedValue(canvas);
    const element = document.createElement('div');
    const image = document.createElement('img');
    let finishDecode = () => {};
    image.decode = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDecode = resolve;
        }),
    );
    element.append(image);

    const saving = saveRecapImage(element);

    expect(image.loading).toBe('eager');
    expect(toCanvas).not.toHaveBeenCalled();
    finishDecode();
    await saving;
    expect(toCanvas).toHaveBeenCalledOnce();
  });

  it('toCanvas를 includeQueryParams: true, skipFonts: true, pixelRatio: 1 옵션으로 호출한다', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(new Blob(['fake']));
    toCanvas.mockResolvedValue(canvas);
    const element = document.createElement('div');

    await saveRecapImage(element);

    expect(toCanvas).toHaveBeenCalledWith(element, {
      includeQueryParams: true,
      skipFonts: true,
      pixelRatio: 1,
    });
  });
});
