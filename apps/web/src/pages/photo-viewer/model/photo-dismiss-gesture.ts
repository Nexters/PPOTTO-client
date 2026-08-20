export type DragAxis = 'pending' | 'horizontal' | 'vertical';

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

const SCALE_DISTANCE = 400;
const MAX_SCALE_DOWN = 0.06;

function dragProgress(dragY: number): number {
  return Math.min(Math.max(dragY, 0) / SCALE_DISTANCE, 1);
}

export function dragYToScale(dragY: number): number {
  return 1 - dragProgress(dragY) * MAX_SCALE_DOWN;
}
