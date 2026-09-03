import type { components } from '@ppotto/api';

import type { BoardDetail, UpdateBoardLayoutInput } from '@/entities/board/api/board-api';
import { uuidv7 } from '@/shared/lib/uuidv7';

import { BOARD_TEXT_STYLE } from '../ui/board-text-style';

import type { PinchSample } from './board-transform';
import { clamp, distance, distanceToSegment, type Point } from './geometry';

type DrawingChanges = NonNullable<UpdateBoardLayoutInput['drawings']>;
export type DrawingCreateInput = NonNullable<NonNullable<DrawingChanges['created']>[number]>;
export type DrawingItem = BoardDetail['drawings'][number];

export type ParsedDrawing = {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
  zIndex: number;
};

// BoardDetail은 paths의 v1|v2 유니온이라 못 담는, v2 전용 drawings 원소 타입
export type DrawingV2Item = components['schemas']['DrawingV2Response'];
export type TextDrawingItem = components['schemas']['DrawingTextResponse'];
export type StrokeDrawingItem = components['schemas']['DrawingStrokeResponse'];

export type ParsedText = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  maxWidth: number;
  zIndex: number;
};

// discriminator mapping 누락으로 생성된 type 값이 실제 응답과 달라, content 존재 여부로 구분
export function isTextDrawing(drawing: DrawingV2Item): drawing is TextDrawingItem {
  return 'content' in drawing;
}

export function isStrokeDrawing(drawing: DrawingV2Item): drawing is StrokeDrawingItem {
  return 'stroke' in drawing;
}

export function parseTextDrawing(drawing: TextDrawingItem): ParsedText {
  return {
    id: drawing.id,
    text: drawing.content,
    x: drawing.posX,
    y: drawing.posY,
    fontSize: drawing.fontSize,
    maxWidth: drawing.maxWidth,
    zIndex: drawing.zIndex,
  };
}

export function toTextCreateInput(
  id: string,
  options: {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    maxWidth: number;
    zIndex: number;
    color?: string;
  },
): DrawingCreateInput {
  return {
    id,
    type: 'TEXT',
    scope: 'BOARD',
    color: options.color ?? '#FFFFFF',
    content: options.text,
    posX: options.x,
    posY: options.y,
    fontSize: options.fontSize,
    maxWidth: options.maxWidth,
    rotation: 0,
    zIndex: options.zIndex,
  } as DrawingCreateInput;
}

const STROKE_SAMPLE_MIN_DISTANCE = 2;

export function shouldSampleStrokePoint(points: Point[], candidate: Point): boolean {
  const last = points[points.length - 1];
  return !last || distance(last, candidate) >= STROKE_SAMPLE_MIN_DISTANCE;
}

// scope는 항상 'BOARD' — 스티커 귀속(scope='STICKER')은 귀속 기준이 아직 정해지지 않아 별도 이슈로 미룸.
// zIndex는 API 스키마에 없는 필드라, stroke가 자유 형식 JSON이라는 점을 이용해 points와 함께 담는다 —
// 스티커의 zIndex와 같은 숫자 공간을 공유해서 그림/스티커를 섞어 쌓을 수 있게 하기 위함(백엔드 변경 없음)
function toDrawingInput(
  id: string,
  points: Point[],
  options: { color: string; strokeWidth: number; zIndex?: number },
): DrawingCreateInput {
  return {
    id,
    scope: 'BOARD',
    stroke: { points: points.map((point) => [point.x, point.y]), zIndex: options.zIndex ?? 0 },
    color: options.color,
    strokeWidth: options.strokeWidth,
  };
}

export function toDrawingCreateInput(
  points: Point[],
  options: { color: string; strokeWidth: number; zIndex?: number },
): DrawingCreateInput {
  return toDrawingInput(uuidv7(), points, options);
}

export function toDrawingMoveInput(
  id: string,
  points: Point[],
  options: { color: string; strokeWidth: number; zIndex?: number },
): DrawingCreateInput {
  return toDrawingInput(id, points, options);
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

// 저장된 그림의 stroke(자유 형식 JSON)에서 zIndex를 복원한다.
export function parseStrokeZIndex(stroke: unknown): number {
  if (!stroke || typeof stroke !== 'object' || !('zIndex' in stroke)) return 0;
  const { zIndex } = stroke as { zIndex: unknown };
  return typeof zIndex === 'number' ? zIndex : 0;
}

// Sticker.tsx의 stickerZIndex(=zIndex*2)와 같은 배율을 써서, 스티커 뱃지가 자기 스티커
// 바로 위(zIndex*2+1)에 오는 것과 같은 숫자 공간 안에서 그림도 스티커와 실제로 섞여 쌓이게 한다
export function drawingZIndex(drawing: Pick<ParsedDrawing, 'zIndex'>): number {
  return drawing.zIndex * 2;
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

export function isPointInDrawingBounds(point: Point, bounds: DrawingBounds): boolean {
  return (
    Math.abs(point.x - bounds.x) <= bounds.width / 2 &&
    Math.abs(point.y - bounds.y) <= bounds.height / 2
  );
}

export function getTextBounds(text: ParsedText): DrawingBounds {
  const lineCount = text.text.split('\n').length;
  return {
    x: text.x,
    y: text.y,
    width: text.maxWidth,
    height: text.fontSize * BOARD_TEXT_STYLE.lineHeight * lineCount,
  };
}

export function hitTestTextId(point: Point, texts: ParsedText[]): string | null {
  for (let i = texts.length - 1; i >= 0; i -= 1) {
    const text = texts[i]!;
    if (isPointInDrawingBounds(point, getTextBounds(text))) return text.id;
  }
  return null;
}

export const DRAWING_PINCH_SCALE_MIN = 0.3;
export const DRAWING_PINCH_SCALE_MAX = 4;

export function computeDrawingPinchTransform(
  basePoints: Point[],
  baseStrokeWidth: number,
  start: PinchSample,
  current: PinchSample,
): { points: Point[]; strokeWidth: number } {
  if (start.distance === 0) return { points: basePoints, strokeWidth: baseStrokeWidth };

  const scaleRatio = clamp(
    current.distance / start.distance,
    DRAWING_PINCH_SCALE_MIN,
    DRAWING_PINCH_SCALE_MAX,
  );
  const rad = ((current.angle - start.angle) * Math.PI) / 180;
  const dx = current.centroid.x - start.centroid.x;
  const dy = current.centroid.y - start.centroid.y;

  const transformPoint = (point: Point): Point => {
    const vx = point.x - start.centroid.x;
    const vy = point.y - start.centroid.y;
    return {
      x: start.centroid.x + (vx * Math.cos(rad) - vy * Math.sin(rad)) * scaleRatio + dx,
      y: start.centroid.y + (vx * Math.sin(rad) + vy * Math.cos(rad)) * scaleRatio + dy,
    };
  };

  return {
    points: basePoints.map(transformPoint),
    strokeWidth: baseStrokeWidth * scaleRatio,
  };
}

export type DrawingBoxTransform = { x: number; y: number; rotation: number; scale: number };

export function computeDrawingBoxPinchTransform(
  base: DrawingBoxTransform,
  start: PinchSample,
  current: PinchSample,
): DrawingBoxTransform {
  if (start.distance === 0) return base;

  const scale = clamp(
    base.scale * (current.distance / start.distance),
    DRAWING_PINCH_SCALE_MIN,
    DRAWING_PINCH_SCALE_MAX,
  );
  const scaleRatio = scale / base.scale;
  const rotation = base.rotation + (current.angle - start.angle);
  const rad = ((current.angle - start.angle) * Math.PI) / 180;

  const vx = base.x - start.centroid.x;
  const vy = base.y - start.centroid.y;
  const dx = current.centroid.x - start.centroid.x;
  const dy = current.centroid.y - start.centroid.y;

  return {
    x: start.centroid.x + (vx * Math.cos(rad) - vy * Math.sin(rad)) * scaleRatio + dx,
    y: start.centroid.y + (vx * Math.sin(rad) + vy * Math.cos(rad)) * scaleRatio + dy,
    rotation,
    scale,
  };
}
