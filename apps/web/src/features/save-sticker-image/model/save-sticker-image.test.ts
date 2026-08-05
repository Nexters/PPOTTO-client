import type Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/capture-konva-node', () => ({ captureKonvaNode: vi.fn() }));
vi.mock('@/shared/lib/canvas-to-blob', () => ({ canvasToBlob: vi.fn() }));

import { canvasToBlob } from '@/shared/lib/canvas-to-blob';
import { captureKonvaNode } from '@/shared/lib/capture-konva-node';

import { saveStickerImage } from './save-sticker-image';

describe('saveStickerImage', () => {
  it('노드를 캡처해 Blob으로 변환한다', async () => {
    const canvas = document.createElement('canvas');
    const blob = new Blob(['fake']);
    vi.mocked(captureKonvaNode).mockReturnValue(canvas);
    vi.mocked(canvasToBlob).mockResolvedValue(blob);
    const node = {} as Konva.Node;

    const result = await saveStickerImage(node);

    expect(captureKonvaNode).toHaveBeenCalledWith(node);
    expect(canvasToBlob).toHaveBeenCalledWith(canvas);
    expect(result).toBe(blob);
  });
});
