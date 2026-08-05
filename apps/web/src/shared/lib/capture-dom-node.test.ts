import { describe, expect, it, vi } from 'vitest';

const toCanvas = vi.hoisted(() => vi.fn());

vi.mock('html-to-image', () => ({ toCanvas }));

import { captureDomNode } from './capture-dom-node';

describe('captureDomNode', () => {
  it('엘리먼트를 html-to-image의 toCanvas로 캡처해 캔버스를 반환한다', async () => {
    const canvas = document.createElement('canvas');
    toCanvas.mockResolvedValue(canvas);
    const element = document.createElement('div');

    const result = await captureDomNode(element);

    expect(toCanvas).toHaveBeenCalledWith(element, { includeQueryParams: true });
    expect(result).toBe(canvas);
  });
});
