import { afterEach, describe, expect, it, vi } from 'vitest';

const toCanvas = vi.hoisted(() => vi.fn());

vi.mock('html-to-image', () => ({ toCanvas }));

import { captureElementAsBlob } from './capture-element-as-blob';

describe('captureElementAsBlob', () => {
  afterEach(() => {
    toCanvas.mockClear();
  });

  it('엘리먼트를 캡처해 Blob으로 변환한다', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(new Blob(['fake']));
    toCanvas.mockResolvedValue(canvas);
    const element = document.createElement('div');

    const result = await captureElementAsBlob(element);

    expect(result).toBeInstanceOf(Blob);
  });

  it('기본으로 includeQueryParams: true 옵션을 준다', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(new Blob(['fake']));
    toCanvas.mockResolvedValue(canvas);
    const element = document.createElement('div');

    await captureElementAsBlob(element);

    expect(toCanvas).toHaveBeenCalledWith(element, { includeQueryParams: true });
    // iOS WebKit 첫 래스터라이즈 누락 대응 — 같은 입력을 여러 번 그린다
    expect(toCanvas).toHaveBeenCalledTimes(3);
  });

  it('모든 이미지의 디코딩이 끝난 뒤 캡처한다', async () => {
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

    const capturing = captureElementAsBlob(element);

    expect(image.loading).toBe('eager');
    expect(toCanvas).not.toHaveBeenCalled();
    finishDecode();
    await capturing;
    expect(toCanvas).toHaveBeenCalledTimes(3);
  });

  it('전달한 옵션을 병합해 toCanvas에 넘긴다', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(new Blob(['fake']));
    toCanvas.mockResolvedValue(canvas);
    const element = document.createElement('div');

    await captureElementAsBlob(element, { skipFonts: true, pixelRatio: 1 });

    expect(toCanvas).toHaveBeenCalledWith(element, {
      includeQueryParams: true,
      skipFonts: true,
      pixelRatio: 1,
    });
  });
});
