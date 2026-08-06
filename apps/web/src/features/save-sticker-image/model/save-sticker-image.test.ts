import type Konva from 'konva';
import { describe, expect, it } from 'vitest';

import { saveStickerImage } from './save-sticker-image';

describe('saveStickerImage', () => {
  it('노드를 캡처해 Blob으로 변환한다', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (callback) => callback(new Blob(['fake']));
    const node = { toCanvas: () => canvas } as unknown as Konva.Node;

    const result = await saveStickerImage(node);

    expect(result).toBeInstanceOf(Blob);
  });
});
