import { toCanvas } from 'html-to-image';

import { canvasToBlob } from '@/shared/lib/canvas-to-blob';

export async function saveStickerImage(element: HTMLElement): Promise<Blob> {
  const canvas = await toCanvas(element, { includeQueryParams: true });
  return canvasToBlob(canvas);
}
