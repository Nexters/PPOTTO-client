import type { BoardDetail, UpdateBoardLayoutInput } from '@/entities/board/api/board-api';
import { uuidv7 } from '@/shared/lib/uuidv7';

import { distance, type Point } from './geometry';

type DrawingChanges = NonNullable<UpdateBoardLayoutInput['drawings']>;
export type DrawingCreateInput = NonNullable<NonNullable<DrawingChanges['created']>[number]>;
export type DrawingItem = BoardDetail['drawings'][number];

// 직전에 채택한 점에서 이 거리(보드 좌표 단위 — 화면 픽셀 아님, 줌 배율에 따라 화면상 간격이
// 달라짐) 이상 떨어졌을 때만 새 점으로 채택한다.
// pointermove는 손가락을 거의 안 움직여도 자주 발생해서, 그대로 다 담으면 점이 불필요하게 쌓인다.
// 첫 시도값이라 렌더링 붙이고 실제로 보면서 조정 필요할 수 있음
const STROKE_SAMPLE_MIN_DISTANCE = 2;

export function shouldSampleStrokePoint(points: Point[], candidate: Point): boolean {
  const last = points[points.length - 1];
  return !last || distance(last, candidate) >= STROKE_SAMPLE_MIN_DISTANCE;
}

// 캡처된 점들과 색상/굵기를 저장 요청 형태로 직렬화한다.
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
