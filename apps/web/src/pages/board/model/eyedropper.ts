export type EyedropperPixels = Pick<ImageData, 'data' | 'height' | 'width'>;

export function readCanvasPixels(canvas: HTMLCanvasElement): EyedropperPixels | null {
  const context = canvas.getContext('2d');
  if (!context) return null;

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function sampleColorAt(pixels: EyedropperPixels, x: number, y: number): string {
  const clampedX = Math.min(Math.max(Math.round(x), 0), pixels.width - 1);
  const clampedY = Math.min(Math.max(Math.round(y), 0), pixels.height - 1);
  const offset = (clampedY * pixels.width + clampedX) * 4;
  const { data } = pixels;

  return rgbToHex(data[offset]!, data[offset + 1]!, data[offset + 2]!);
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

const ICON_COLOR_DARK = '#181818';
const ICON_COLOR_LIGHT = '#ffffff';
const BRIGHTNESS_THRESHOLD = 128;

// 배경색 위에서 아이콘이 항상 보이도록, 배경의 체감 밝기(YIQ 공식)에 따라 검정/흰색 중 대비되는 쪽을 고른다
export function getContrastingIconColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > BRIGHTNESS_THRESHOLD ? ICON_COLOR_DARK : ICON_COLOR_LIGHT;
}
