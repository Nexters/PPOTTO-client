export type Point = { x: number; y: number };

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const segmentLengthSquared = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (segmentLengthSquared === 0) return distance(p, a);

  const t = clamp(
    ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / segmentLengthSquared,
    0,
    1,
  );
  const projection = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return distance(p, projection);
}

export function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function angleBetween(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function rotatePoint(point: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  return {
    x: point.x * Math.cos(rad) - point.y * Math.sin(rad),
    y: point.x * Math.sin(rad) + point.y * Math.cos(rad),
  };
}
