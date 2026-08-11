import { clamp, type Point } from './geometry';

export const STICKER_SCALE_MIN = 0.3;
export const STICKER_SCALE_MAX = 4;

const SNAP_STEP = 90;
const SNAP_TOLERANCE = 5;

export type StickerTransform = { x: number; y: number; rotation: number; scale: number };
export type PinchSample = { centroid: Point; distance: number; angle: number };

export function scaleBadgeOffset(offset: Point, currentScale: number, baseScale: number): Point {
  if (baseScale === 0) return offset;

  const ratio = currentScale / baseScale;
  return { x: offset.x * ratio, y: offset.y * ratio };
}

// 회전각을 0/90/180/270°에 ±5° 이내로 들어오면 그 값으로 스냅한다
export function applySnap(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  const nearest = Math.round(normalized / SNAP_STEP) * SNAP_STEP;
  return Math.abs(normalized - nearest) <= SNAP_TOLERANCE ? nearest % 360 : normalized;
}

// 두 손가락 제스처로 스티커를 회전+확대+이동한다.
// 회전/확대의 중심은 스티커의 중심이 아니라 두 손가락의 중점으로 한다.
export function computeStickerPinchTransform(
  base: StickerTransform,
  start: PinchSample,
  current: PinchSample,
): StickerTransform {
  if (start.distance === 0) return base;

  const scale = clamp(
    base.scale * (current.distance / start.distance),
    STICKER_SCALE_MIN,
    STICKER_SCALE_MAX,
  );
  const scaleRatio = scale / base.scale;
  const rotation = applySnap(base.rotation + (current.angle - start.angle));
  const rad = ((rotation - base.rotation) * Math.PI) / 180;

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
