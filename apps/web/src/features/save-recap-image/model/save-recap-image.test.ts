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
});
