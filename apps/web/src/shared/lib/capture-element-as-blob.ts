import { toCanvas } from 'html-to-image';

import { canvasToBlob } from './canvas-to-blob';

export async function captureElementAsCanvas(
  element: HTMLElement,
  options?: Parameters<typeof toCanvas>[1],
): Promise<HTMLCanvasElement> {
  await Promise.all(
    Array.from(element.querySelectorAll('img'), (image) => {
      image.loading = 'eager';
      return image.decode();
    }),
  );

  return toCanvas(element, { includeQueryParams: true, ...options });
}

export async function captureElementAsBlob(
  element: HTMLElement,
  options?: Parameters<typeof toCanvas>[1],
): Promise<Blob> {
  const canvas = await captureElementAsCanvas(element, options);
  return canvasToBlob(canvas);
}
