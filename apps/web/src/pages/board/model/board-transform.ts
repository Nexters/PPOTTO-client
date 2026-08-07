import { distance, type Point } from './geometry';

export function computeResizeScale(
  center: Point,
  startPoint: Point,
  currentPoint: Point,
  startScale: number,
): number {
  const startDistance = distance(center, startPoint);
  if (startDistance === 0) return startScale;

  const currentDistance = distance(center, currentPoint);
  return startScale * (currentDistance / startDistance);
}
