import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  calculatePinchTransform,
  distanceBetween,
  midpointBetween,
  type Point,
  type ZoomTransform,
} from './photo-zoom';

const MIN_SCALE = 1;
const MAX_SCALE = 3;

type PinchStart = {
  distance: number;
  scale: number;
  focalPoint: Point;
  baseLeft: number;
  baseTop: number;
};

export function usePhotoZoomGesture(
  gestureRef: RefObject<HTMLDivElement | null>,
  interactionBlockedRef: RefObject<boolean>,
  onPinchStart: () => void,
) {
  const pointersRef = useRef(new Map<number, Point>());
  const transformRef = useRef<ZoomTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const pinchStartRef = useRef<PinchStart | null>(null);
  const rafRef = useRef<number | null>(null);
  const onPinchStartRef = useRef(onPinchStart);
  const [isZoomed, setIsZoomed] = useState(false);

  useLayoutEffect(() => {
    onPinchStartRef.current = onPinchStart;
  });

  const applyTransform = () => {
    const element = gestureRef.current;
    if (!element) return;
    const { translateX, translateY, scale } = transformRef.current;
    element.style.transform =
      scale === MIN_SCALE ? '' : `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
  };

  const scheduleTransform = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyTransform();
    });
  };

  const beginPinch = (element: HTMLDivElement) => {
    const points = [...pointersRef.current.values()];
    const first = points[0];
    const second = points[1];
    if (!first || !second) return;

    const current = transformRef.current;
    if (current.scale === MIN_SCALE) onPinchStartRef.current();
    interactionBlockedRef.current = true;
    const center = midpointBetween(first, second);
    const rect = element.getBoundingClientRect();
    const baseLeft = rect.left - current.translateX;
    const baseTop = rect.top - current.translateY;
    pinchStartRef.current = {
      distance: distanceBetween(first, second),
      scale: current.scale,
      focalPoint: {
        x: (center.x - baseLeft - current.translateX) / current.scale,
        y: (center.y - baseTop - current.translateY) / current.scale,
      },
      baseLeft,
      baseTop,
    };

    for (const pointerId of pointersRef.current.keys()) {
      element.setPointerCapture(pointerId);
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size >= 2) {
      beginPinch(event.currentTarget);
      return;
    }

    pinchStartRef.current = null;
    interactionBlockedRef.current = transformRef.current.scale > MIN_SCALE;
  };

  const handlePointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2) {
      event.preventDefault();
      event.stopPropagation();
      beginPinch(event.currentTarget);
      return;
    }

    if (interactionBlockedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handlePointerMoveCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pinchStart = pinchStartRef.current;
    const points = [...pointersRef.current.values()];
    const first = points[0];
    const second = points[1];
    if (!pinchStart || !first || !second) {
      if (interactionBlockedRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const center = midpointBetween(first, second);
    const next = calculatePinchTransform({
      startDistance: pinchStart.distance,
      startScale: pinchStart.scale,
      startFocalPoint: pinchStart.focalPoint,
      currentDistance: distanceBetween(first, second),
      currentCenter: {
        x: center.x - pinchStart.baseLeft,
        y: center.y - pinchStart.baseTop,
      },
      minScale: MIN_SCALE,
      maxScale: MAX_SCALE,
    });
    transformRef.current = next;
    interactionBlockedRef.current = true;
    setIsZoomed(next.scale > MIN_SCALE);
    scheduleTransform();
  };

  const handlePointerUpCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pinchStartRef.current || interactionBlockedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
    finishPointer(event);
  };

  const handlePointerCancelCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pinchStartRef.current || interactionBlockedRef.current) event.stopPropagation();
    finishPointer(event);
  };

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      interactionBlockedRef.current = false;
    },
    [interactionBlockedRef],
  );

  return {
    isZoomed,
    handlers: {
      onPointerDownCapture: handlePointerDownCapture,
      onPointerMoveCapture: handlePointerMoveCapture,
      onPointerUpCapture: handlePointerUpCapture,
      onPointerCancelCapture: handlePointerCancelCapture,
    },
  };
}
