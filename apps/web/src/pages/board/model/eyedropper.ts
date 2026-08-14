export function sampleColorAt(canvas: HTMLCanvasElement, x: number, y: number): string | null {
  const context = canvas.getContext('2d');
  if (!context) return null;

  const clampedX = Math.min(Math.max(Math.round(x), 0), canvas.width - 1);
  const clampedY = Math.min(Math.max(Math.round(y), 0), canvas.height - 1);
  const [r, g, b] = context.getImageData(clampedX, clampedY, 1, 1).data;

  return rgbToHex(r!, g!, b!);
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
