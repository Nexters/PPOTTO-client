import { describe, expect, it, vi } from 'vitest';

import { canvasToBlob } from './canvas-to-blob';

describe('canvasToBlob', () => {
  it('캔버스를 Blob으로 변환해 반환한다', async () => {
    const blob = new Blob(['fake']);
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(blob);

    const result = await canvasToBlob(canvas);

    expect(result).toBe(blob);
  });

  it('Blob 생성에 실패하면 reject한다', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(null);

    await expect(canvasToBlob(canvas)).rejects.toThrow('캔버스를 Blob으로 변환하지 못했습니다.');
  });

  it('요청한 이미지 형식과 품질로 변환한다', async () => {
    const blob = new Blob(['webp'], { type: 'image/webp' });
    const canvas = document.createElement('canvas');
    const toBlob = vi.fn((callback: BlobCallback) => callback(blob));
    canvas.toBlob = toBlob;

    await canvasToBlob(canvas, { type: 'image/webp', quality: 0.9 });

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.9);
  });
});
