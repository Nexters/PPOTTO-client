import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/capture-dom-node', () => ({ captureDomNode: vi.fn() }));
vi.mock('@/shared/lib/canvas-to-blob', () => ({ canvasToBlob: vi.fn() }));

import { canvasToBlob } from '@/shared/lib/canvas-to-blob';
import { captureDomNode } from '@/shared/lib/capture-dom-node';

import { saveRecapImage } from './save-recap-image';

describe('saveRecapImage', () => {
  it('엘리먼트를 캡처해 Blob으로 변환한다', async () => {
    const canvas = document.createElement('canvas');
    const blob = new Blob(['fake']);
    vi.mocked(captureDomNode).mockResolvedValue(canvas);
    vi.mocked(canvasToBlob).mockResolvedValue(blob);
    const element = document.createElement('div');

    const result = await saveRecapImage(element);

    expect(captureDomNode).toHaveBeenCalledWith(element);
    expect(canvasToBlob).toHaveBeenCalledWith(canvas);
    expect(result).toBe(blob);
  });
});
