import { describe, expect, it } from 'vitest';

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
});
