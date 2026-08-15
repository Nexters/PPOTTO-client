import type { BoardDetail, UpdateBoardLayoutInput } from '@/entities/board/api/board-api';
import { uuidv7 } from '@/shared/lib/uuidv7';

import { distance, distanceToSegment, type Point } from './geometry';

type DrawingChanges = NonNullable<UpdateBoardLayoutInput['drawings']>;
export type DrawingCreateInput = NonNullable<NonNullable<DrawingChanges['created']>[number]>;
export type DrawingItem = BoardDetail['drawings'][number];

export type ParsedDrawing = {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
};

const STROKE_SAMPLE_MIN_DISTANCE = 2;

export function shouldSampleStrokePoint(points: Point[], candidate: Point): boolean {
  const last = points[points.length - 1];
  return !last || distance(last, candidate) >= STROKE_SAMPLE_MIN_DISTANCE;
}

// scope는 항상 'BOARD' — 스티커 귀속(scope='STICKER')은 귀속 기준이 아직 정해지지 않아 별도 이슈로 미룸
export function toDrawingCreateInput(
  points: Point[],
  options: { color: string; strokeWidth: number },
): DrawingCreateInput {
  return {
    id: uuidv7(),
    scope: 'BOARD',
    stroke: { points: points.map((point) => [point.x, point.y]) },
    color: options.color,
    strokeWidth: options.strokeWidth,
  };
}

// 저장된 그림의 stroke(자유 형식 JSON)에서 점 배열을 복원한다.
export function parseStrokePoints(stroke: unknown): Point[] {
  if (!stroke || typeof stroke !== 'object' || !('points' in stroke)) return [];
  const { points } = stroke as { points: unknown };
  if (!Array.isArray(points)) return [];

  return points
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === 'number' &&
        typeof point[1] === 'number',
    )
    .map(([x, y]) => ({ x, y }));
}

// 점들을 SVG path의 d 속성 문자열로 변환한다
export function toPathData(points: Point[]): string {
  if (points.length === 0) return '';

  const [first, ...rest] = points;
  const start = `M${first!.x},${first!.y}`;
  const segments = rest.map((point) => `L${point.x},${point.y}`);
  return [start, ...segments].join(' ');
}

const HIT_TEST_TOLERANCE = 8;

export function hitTestDrawingId(point: Point, drawings: ParsedDrawing[]): string | null {
  for (let i = drawings.length - 1; i >= 0; i -= 1) {
    const drawing = drawings[i]!;
    if (isPointNearDrawing(point, drawing)) return drawing.id;
  }
  return null;
}

function isPointNearDrawing(point: Point, drawing: ParsedDrawing): boolean {
  const threshold = drawing.strokeWidth / 2 + HIT_TEST_TOLERANCE;
  const { points } = drawing;

  if (points.length === 1) return distance(point, points[0]!) <= threshold;

  for (let i = 0; i < points.length - 1; i += 1) {
    if (distanceToSegment(point, points[i]!, points[i + 1]!) <= threshold) return true;
  }
  return false;
}

export type DrawingBounds = { x: number; y: number; width: number; height: number };

export function getDrawingBounds(points: Point[], strokeWidth: number): DrawingBounds | null {
  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const padding = strokeWidth / 2;
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}
