import { afterEach, describe, expect, it, vi } from 'vitest';

import { drawCenterSquare } from './board-share-image';

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function mockDrawImage() {
  const drawImage = vi.fn();
  const original = HTMLCanvasElement.prototype.getContext;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    id: string,
  ) {
    if (id !== '2d') return original.call(this, id as '2d');
    return { drawImage } as unknown as CanvasRenderingContext2D;
  });
  return drawImage;
}

describe('drawCenterSquare', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('대상 캔버스를 원본의 짧은 변 길이의 정사각형으로 맞춘다', () => {
    mockDrawImage();
    const target = makeCanvas(0, 0);

    drawCenterSquare(target, makeCanvas(1080, 2220));

    expect(target.width).toBe(1080);
    expect(target.height).toBe(1080);
  });

  it('세로로 긴 보드 화면은 위아래를 같은 만큼 잘라 가운데를 그린다', () => {
    const drawImage = mockDrawImage();
    const source = makeCanvas(1080, 2220);

    drawCenterSquare(makeCanvas(0, 0), source);

    expect(drawImage).toHaveBeenCalledWith(source, 0, 570, 1080, 1080, 0, 0, 1080, 1080);
  });

  it('가로로 긴 화면은 좌우를 같은 만큼 잘라 가운데를 그린다', () => {
    const drawImage = mockDrawImage();
    const source = makeCanvas(1000, 400);

    drawCenterSquare(makeCanvas(0, 0), source);

    expect(drawImage).toHaveBeenCalledWith(source, 300, 0, 400, 400, 0, 0, 400, 400);
  });
});
