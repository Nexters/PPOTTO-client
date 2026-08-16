const KAKAO_SHARE_IMAGE_SIZE = 800;

// 정사각형보다 세로가 길면 위쪽을, 가로가 길면 가운데를 남기고 자름
export function cropCanvasToSquare(
  source: HTMLCanvasElement,
  size = KAKAO_SHARE_IMAGE_SIZE,
): HTMLCanvasElement {
  const { width, height } = source;
  const side = Math.min(width, height);
  const sx = (width - side) / 2;
  const sy = height > width ? 0 : (height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스 컨텍스트를 가져오지 못했습니다.');
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);

  return canvas;
}
