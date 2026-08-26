export type DragAxis = 'pending' | 'horizontal' | 'vertical';

type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export function calculateContainedImageRect(
  box: Rect,
  naturalWidth: number,
  naturalHeight: number,
): DOMRect | null {
  if (naturalWidth <= 0 || naturalHeight <= 0) return null;

  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;

  return new DOMRect(
    box.left + (box.width - width) / 2,
    box.top + (box.height - height) / 2,
    width,
    height,
  );
}

export type SharedDismissTransform = {
  translateX: number;
  translateY: number;
  scale: number;
};

export function calculateSharedDismissTransform(
  source: Rect,
  destination: Rect,
): SharedDismissTransform | null {
  if (source.width <= 0 || source.height <= 0 || destination.width <= 0) return null;

  const scale = destination.width / source.width;
  if (!Number.isFinite(scale) || scale <= 0) return null;

  return {
    translateX: destination.left - source.left,
    translateY: destination.top - source.top,
    scale,
  };
}

export function toRelativeRect(rect: Rect, container: Rect): DOMRect {
  return new DOMRect(rect.left - container.left, rect.top - container.top, rect.width, rect.height);
}

const AXIS_LOCK_DISTANCE = 6;

export function resolveDragAxis(dx: number, dy: number): DragAxis {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (Math.max(absDx, absDy) < AXIS_LOCK_DISTANCE) return 'pending';
  return absDx > absDy ? 'horizontal' : 'vertical';
}

export type DragSample = { y: number; time: number };

export function calculateReleaseVelocity(
  samples: readonly DragSample[],
  releaseTime: number,
  maxAge: number,
): number {
  const latest = samples.at(-1);
  if (!latest || releaseTime - latest.time > maxAge) return 0;

  const earliest = samples[0];
  if (!earliest || latest.time <= earliest.time) return 0;
  return (latest.y - earliest.y) / (latest.time - earliest.time);
}

// 위로 당기는 건 닫기 동작이 아니므로 무시
export function clampDragY(rawDragY: number): number {
  return Math.max(rawDragY, 0);
}

const DISMISS_DISTANCE_RATIO = 0.16;
const DISMISS_VELOCITY_PX_MS = 0.6;

export function shouldDismiss(dragY: number, viewportHeight: number, velocityY: number): boolean {
  return dragY > viewportHeight * DISMISS_DISTANCE_RATIO || velocityY > DISMISS_VELOCITY_PX_MS;
}

const SCALE_DISTANCE_RATIO = 0.3;
const MAX_SCALE_DOWN = 0.12;

function dragProgress(dragY: number, viewportHeight: number): number {
  const scaleDistance = viewportHeight * SCALE_DISTANCE_RATIO;
  if (scaleDistance <= 0) return 0;
  return Math.min(Math.max(dragY, 0) / scaleDistance, 1);
}

export function dragYToScale(dragY: number, viewportHeight: number): number {
  return 1 - dragProgress(dragY, viewportHeight) * MAX_SCALE_DOWN;
}
