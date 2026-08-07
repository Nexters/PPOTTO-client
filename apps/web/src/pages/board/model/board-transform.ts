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

export function scaleBadgeOffset(offset: Point, currentScale: number, baseScale: number): Point {
  if (baseScale === 0) return offset;

  const ratio = currentScale / baseScale;
  return { x: offset.x * ratio, y: offset.y * ratio };
}
