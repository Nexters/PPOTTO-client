import { toCanvas } from 'html-to-image';

import { canvasToBlob } from './canvas-to-blob';

export async function captureElementAsBlob(
  element: HTMLElement,
  options?: Parameters<typeof toCanvas>[1],
): Promise<Blob> {
  const canvas = await toCanvas(element, { includeQueryParams: true, ...options });
  return canvasToBlob(canvas);
}
