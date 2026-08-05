import { toCanvas } from 'html-to-image';

export function captureDomNode(element: HTMLElement): Promise<HTMLCanvasElement> {
  return toCanvas(element);
}
