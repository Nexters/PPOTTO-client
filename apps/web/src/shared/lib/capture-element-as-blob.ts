import { toCanvas } from 'html-to-image';

import { canvasToBlob } from './canvas-to-blob';

export async function captureElementAsBlob(
  element: HTMLElement,
  options?: Parameters<typeof toCanvas>[1],
): Promise<Blob> {
  await Promise.all(
    Array.from(element.querySelectorAll('img'), (image) => {
      image.loading = 'eager';
      return image.decode();
    }),
  );

  const canvas = await toCanvas(element, { includeQueryParams: true, ...options });
  return canvasToBlob(canvas);
}
