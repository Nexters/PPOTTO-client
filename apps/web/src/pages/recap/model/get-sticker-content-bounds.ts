export type ContentBounds = { x: number; y: number; width: number; height: number };

const ALPHA_THRESHOLD = 10;

// RGBA 픽셀 배열에서 불투명 픽셀들의 bounding box 계산, 좌표는 원본 이미지 픽셀 기준
export function computeContentBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): ContentBounds | null {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha === undefined || alpha <= ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function getStickerContentBounds(imageUrl: string): Promise<ContentBounds | null> {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return computeContentBounds(data, canvas.width, canvas.height);
}
