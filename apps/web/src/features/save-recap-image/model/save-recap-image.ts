import { canvasToBlob } from '@/shared/lib/canvas-to-blob';
import { captureDomNode } from '@/shared/lib/capture-dom-node';

export async function saveRecapImage(element: HTMLElement): Promise<Blob> {
  const canvas = await captureDomNode(element);
  return canvasToBlob(canvas);
}
