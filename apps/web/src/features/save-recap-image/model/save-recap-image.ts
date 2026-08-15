import { toCanvas } from 'html-to-image';

import { canvasToBlob } from '@/shared/lib/canvas-to-blob';

export async function saveRecapImage(element: HTMLElement): Promise<Blob> {
  await Promise.all(
    Array.from(element.querySelectorAll('img'), (image) => {
      image.loading = 'eager';
      return image.decode();
    }),
  );

  const canvas = await toCanvas(element, {
    includeQueryParams: true,
    skipFonts: true,
    pixelRatio: 1,
  });
  return canvasToBlob(canvas);
}
