import type Konva from 'konva';

import { canvasToBlob } from '@/shared/lib/canvas-to-blob';
import { captureKonvaNode } from '@/shared/lib/capture-konva-node';

export async function saveStickerImage(node: Konva.Node): Promise<Blob> {
  const canvas = captureKonvaNode(node);
  return canvasToBlob(canvas);
}
