import type Konva from 'konva';

export function captureKonvaNode(node: Konva.Node): HTMLCanvasElement {
  return node.toCanvas();
}
