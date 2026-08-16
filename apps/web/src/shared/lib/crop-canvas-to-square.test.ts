import { describe, expect, it, vi } from 'vitest';

import { cropCanvasToSquare } from './crop-canvas-to-square';

function makeSourceCanvas(width: number, height: number): HTMLCanvasElement {
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

describe('cropCanvasToSquare', () => {
  it('결과 캔버스는 지정한 크기의 정사각형이다', () => {
    mockDrawImage();
    const source = makeSourceCanvas(400, 1000);

    const result = cropCanvasToSquare(source, 800);

    expect(result.width).toBe(800);
    expect(result.height).toBe(800);
  });

  it('세로가 더 길면 위쪽을 기준으로 잘라낸다', () => {
    const drawImage = mockDrawImage();
    const source = makeSourceCanvas(400, 1000);

    cropCanvasToSquare(source, 800);

    // source에서 (0, 0)부터 400x400 영역을 떠서 800x800으로 그린다
    expect(drawImage).toHaveBeenCalledWith(source, 0, 0, 400, 400, 0, 0, 800, 800);
  });

  it('가로가 더 길면 가운데를 기준으로 잘라낸다', () => {
    const drawImage = mockDrawImage();
    const source = makeSourceCanvas(1000, 400);

    cropCanvasToSquare(source, 800);

    // 가로 여백((1000-400)/2 = 300)만큼 안쪽에서 400x400 영역을 뜬다
    expect(drawImage).toHaveBeenCalledWith(source, 300, 0, 400, 400, 0, 0, 800, 800);
  });

  it('이미 정사각형이면 그대로 리사이즈만 한다', () => {
    const drawImage = mockDrawImage();
    const source = makeSourceCanvas(500, 500);

    cropCanvasToSquare(source, 800);

    expect(drawImage).toHaveBeenCalledWith(source, 0, 0, 500, 500, 0, 0, 800, 800);
  });
});
