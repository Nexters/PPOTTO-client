import type Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';

import { captureKonvaNode } from './capture-konva-node';

describe('captureKonvaNode', () => {
  it('노드의 toCanvas 결과를 그대로 반환한다', () => {
    const canvas = document.createElement('canvas');
    const node = { toCanvas: vi.fn(() => canvas) } as unknown as Konva.Node;

    const result = captureKonvaNode(node);

    expect(node.toCanvas).toHaveBeenCalledTimes(1);
    expect(result).toBe(canvas);
  });
});
