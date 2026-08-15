export type ContentBounds = { x: number; y: number; width: number; height: number };
// 스티커 실제 모양(불투명 픽셀)을 cellSize 단위로 나눈 점유 맵. bounding box 대신 모양 그대로 사용
export type OccupancyGrid = { cellSize: number; cols: number; rows: number; occupied: boolean[] };

const ALPHA_THRESHOLD = 10;

// 불투명 픽셀들의 bounding box 계산(원본 이미지 픽셀 좌표)
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

// cellSize(원본 이미지 픽셀 기준) 단위 격자로 나눠 칸별 불투명 여부 계산
export function computeOccupancyGrid(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  cellSize: number,
): OccupancyGrid {
  const cols = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const occupied = new Array<boolean>(cols * rows).fill(false);

  for (let y = 0; y < height; y += 1) {
    const row = Math.min(rows - 1, Math.floor(y / cellSize));
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha === undefined || alpha <= ALPHA_THRESHOLD) continue;
      const col = Math.min(cols - 1, Math.floor(x / cellSize));
      occupied[row * cols + col] = true;
    }
  }

  return { cellSize, cols, rows, occupied };
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

export type StickerShape = {
  bounds: ContentBounds | null;
  grid: OccupancyGrid | null; // renderBoxSize 좌표계로 스케일 완료
};

// renderBoxSize: 스티커 렌더 정사각 박스 한 변(px), gridCellSize: 배치 후보 격자와 맞출 칸 크기(px)
export async function getStickerShape(
  imageUrl: string,
  renderBoxSize: number,
  gridCellSize: number,
): Promise<StickerShape> {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d');
  let bounds: ContentBounds | null = null;
  let grid: OccupancyGrid | null = null;
  if (ctx) {
    try {
      ctx.drawImage(image, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const rawBounds = computeContentBounds(data, canvas.width, canvas.height);
      const scale = Math.min(
        renderBoxSize / image.naturalWidth,
        renderBoxSize / image.naturalHeight,
      );
      bounds = rawBounds && {
        x: rawBounds.x * scale,
        y: rawBounds.y * scale,
        width: rawBounds.width * scale,
        height: rawBounds.height * scale,
      };

      // 렌더 좌표계 gridCellSize에 대응하는 원본 픽셀 칸 크기로 역산
      const cellSizeInSource = gridCellSize / scale;
      const rawGrid = computeOccupancyGrid(data, canvas.width, canvas.height, cellSizeInSource);
      grid = { ...rawGrid, cellSize: gridCellSize };
    } catch {
      // CORS 미설정 이미지는 getImageData가 SecurityError — bounds/grid 없이 진행
    }
  }

  return { bounds, grid };
}
