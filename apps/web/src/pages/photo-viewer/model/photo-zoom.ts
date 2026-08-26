export type Point = { x: number; y: number };

export type ZoomTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

export type ZoomRect = { left: number; top: number; width: number; height: number };
export type ZoomEdgeDirection = 'previous' | 'next';

export function distanceBetween(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function midpointBetween(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

export function calculatePointZoomTransform(
  current: ZoomTransform,
  point: Point,
  nextScale: number,
): ZoomTransform {
  const contentX = (point.x - current.translateX) / current.scale;
  const contentY = (point.y - current.translateY) / current.scale;

  return {
    scale: nextScale,
    translateX: point.x - contentX * nextScale,
    translateY: point.y - contentY * nextScale,
  };
}

export function calculatePinchTransform({
  startDistance,
  startScale,
  startFocalPoint,
  currentDistance,
  currentCenter,
  minScale,
  maxScale,
}: {
  startDistance: number;
  startScale: number;
  startFocalPoint: Point;
  currentDistance: number;
  currentCenter: Point;
  minScale: number;
  maxScale: number;
}): ZoomTransform {
  if (startDistance <= 0) return { scale: startScale, translateX: 0, translateY: 0 };

  const scale = Math.min(
    Math.max(startScale * (currentDistance / startDistance), minScale),
    maxScale,
  );
  if (scale === minScale) return { scale, translateX: 0, translateY: 0 };

  return {
    scale,
    translateX: currentCenter.x - startFocalPoint.x * scale,
    translateY: currentCenter.y - startFocalPoint.y * scale,
  };
}

function constrainAxis(
  translation: number,
  scale: number,
  contentStart: number,
  contentSize: number,
  viewportStart: number,
  viewportSize: number,
): number {
  const scaledSize = contentSize * scale;
  if (scaledSize <= viewportSize) {
    return viewportStart + (viewportSize - scaledSize) / 2 - contentStart * scale;
  }

  const minimum = viewportStart + viewportSize - (contentStart + contentSize) * scale;
  const maximum = viewportStart - contentStart * scale;
  return Math.min(Math.max(translation, minimum), maximum);
}

export function constrainZoomTransform(
  transform: ZoomTransform,
  image: ZoomRect,
  viewport: ZoomRect,
): ZoomTransform {
  if (transform.scale <= 1) return { scale: 1, translateX: 0, translateY: 0 };

  return {
    scale: transform.scale,
    translateX: constrainAxis(
      transform.translateX,
      transform.scale,
      image.left,
      image.width,
      viewport.left,
      viewport.width,
    ),
    translateY: constrainAxis(
      transform.translateY,
      transform.scale,
      image.top,
      image.height,
      viewport.top,
      viewport.height,
    ),
  };
}

export function applyZoomBoundaryResistance(
  transform: ZoomTransform,
  image: ZoomRect,
  viewport: ZoomRect,
  resistance: number,
): ZoomTransform {
  const constrained = constrainZoomTransform(transform, image, viewport);
  return {
    scale: transform.scale,
    translateX:
      constrained.translateX + (transform.translateX - constrained.translateX) * resistance,
    translateY:
      constrained.translateY + (transform.translateY - constrained.translateY) * resistance,
  };
}

export function resolveZoomEdgeDirection(
  transform: ZoomTransform,
  image: ZoomRect,
  viewport: ZoomRect,
  deltaX: number,
  deltaY: number,
): ZoomEdgeDirection | null {
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return null;

  const tolerance = 0.5;
  if (deltaX > 0) {
    const outward = constrainZoomTransform(
      { ...transform, translateX: transform.translateX + 1 },
      image,
      viewport,
    );
    return Math.abs(outward.translateX - transform.translateX) <= tolerance ? 'previous' : null;
  }

  const outward = constrainZoomTransform(
    { ...transform, translateX: transform.translateX - 1 },
    image,
    viewport,
  );
  return Math.abs(outward.translateX - transform.translateX) <= tolerance ? 'next' : null;
}

export function shouldNavigateZoomEdge(
  outwardDistance: number,
  viewportWidth: number,
  outwardVelocity: number,
): boolean {
  return outwardDistance >= viewportWidth * 0.15 || outwardVelocity >= 0.5;
}
