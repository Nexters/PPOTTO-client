import type Konva from 'konva';

import { canvasToBlob } from '@/shared/lib/canvas-to-blob';

export async function saveStickerImage(node: Konva.Node): Promise<Blob> {
  const canvas = node.toCanvas();
  return canvasToBlob(canvas);
}
