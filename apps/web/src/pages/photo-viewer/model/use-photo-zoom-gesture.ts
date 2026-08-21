import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  calculatePointZoomTransform,
  calculatePinchTransform,
  constrainZoomTransform,
  distanceBetween,
  midpointBetween,
  type Point,
  type ZoomTransform,
} from './photo-zoom';
import { calculateContainedImageRect } from './photo-dismiss-gesture';

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const DOUBLE_TAP_SCALE = 2;
const DOUBLE_TAP_INTERVAL_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 32;
const TAP_MOVE_TOLERANCE_PX = 8;
const DOUBLE_TAP_TRANSITION_MS = 180;

type PinchStart = {
  distance: number;
  scale: number;
  focalPoint: Point;
  baseLeft: number;
  baseTop: number;
};

type PanStart = Point & {
  pointerId: number;
  translateX: number;
  translateY: number;
};

type TapCandidate = Point & { pointerId: number };
type LastTap = Point & { time: number };

type ZoomGeometry = {
  image: { left: number; top: number; width: number; height: number };
  viewport: { left: number; top: number; width: number; height: number };
};

export function usePhotoZoomGesture(
  gestureRef: RefObject<HTMLDivElement | null>,
  interactionBlockedRef: RefObject<boolean>,
  onPinchStart: () => void,
) {
  const pointersRef = useRef(new Map<number, Point>());
  const transformRef = useRef<ZoomTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const pinchStartRef = useRef<PinchStart | null>(null);
  const panStartRef = useRef<PanStart | null>(null);
  const geometryRef = useRef<ZoomGeometry | null>(null);
  const rafRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const tapCandidateRef = useRef<TapCandidate | null>(null);
  const lastTapRef = useRef<LastTap | null>(null);
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

  const resetZoom = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    isTransitioningRef.current = false;
    tapCandidateRef.current = null;
    lastTapRef.current = null;
    pointersRef.current.clear();
    pinchStartRef.current = null;
    panStartRef.current = null;
    geometryRef.current = null;
    transformRef.current = { scale: MIN_SCALE, translateX: 0, translateY: 0 };
    interactionBlockedRef.current = false;
    setIsZoomed(false);
    const element = gestureRef.current;
    if (element) {
      element.style.transition = '';
      element.style.transform = '';
    }
  };

  const constrainTransform = (transform: ZoomTransform): ZoomTransform => {
    const geometry = geometryRef.current;
    return geometry
      ? constrainZoomTransform(transform, geometry.image, geometry.viewport)
      : transform;
  };

  const measureGeometry = (element: HTMLDivElement) => {
    const image = element.querySelector<HTMLImageElement>(
      '[data-photo-viewer-active-image="true"]',
    );
    if (!image) return;

    const elementRect = element.getBoundingClientRect();
    const imageRect = calculateContainedImageRect(
      image.getBoundingClientRect(),
      image.naturalWidth,
      image.naturalHeight,
    );
    if (!imageRect) return;

    geometryRef.current = {
      image: {
        left: imageRect.left - elementRect.left,
        top: imageRect.top - elementRect.top,
        width: imageRect.width,
        height: imageRect.height,
      },
      viewport: { left: 0, top: 0, width: elementRect.width, height: elementRect.height },
    };
  };

  const beginPinch = (element: HTMLDivElement) => {
    const points = [...pointersRef.current.values()];
    const first = points[0];
    const second = points[1];
    if (!first || !second) return;

    tapCandidateRef.current = null;
    lastTapRef.current = null;

    const current = transformRef.current;
    if (current.scale === MIN_SCALE) {
      onPinchStartRef.current();
      measureGeometry(element);
    }
    interactionBlockedRef.current = true;
    panStartRef.current = null;
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
    if (panStartRef.current?.pointerId === event.pointerId) panStartRef.current = null;
    interactionBlockedRef.current = transformRef.current.scale > MIN_SCALE;
    if (!interactionBlockedRef.current) geometryRef.current = null;
  };

  const handlePointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isTransitioningRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    tapCandidateRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    if (pointersRef.current.size >= 2) {
      event.preventDefault();
      event.stopPropagation();
      beginPinch(event.currentTarget);
      return;
    }

    if (interactionBlockedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      const current = transformRef.current;
      panStartRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        translateX: current.translateX,
        translateY: current.translateY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMoveCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const tapCandidate = tapCandidateRef.current;
    if (
      tapCandidate?.pointerId === event.pointerId &&
      distanceBetween(tapCandidate, { x: event.clientX, y: event.clientY }) > TAP_MOVE_TOLERANCE_PX
    ) {
      tapCandidateRef.current = null;
      lastTapRef.current = null;
    }

    const pinchStart = pinchStartRef.current;
    const points = [...pointersRef.current.values()];
    const first = points[0];
    const second = points[1];
    if (!pinchStart || !first || !second) {
      const panStart = panStartRef.current;
      if (panStart?.pointerId === event.pointerId && transformRef.current.scale > MIN_SCALE) {
        event.preventDefault();
        event.stopPropagation();
        transformRef.current = constrainTransform({
          ...transformRef.current,
          translateX: panStart.translateX + event.clientX - panStart.x,
          translateY: panStart.translateY + event.clientY - panStart.y,
        });
        scheduleTransform();
      } else if (interactionBlockedRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const center = midpointBetween(first, second);
    const next = constrainTransform(
      calculatePinchTransform({
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
      }),
    );
    transformRef.current = next;
    interactionBlockedRef.current = true;
    setIsZoomed(next.scale > MIN_SCALE);
    scheduleTransform();
  };

  const animateDoubleTap = (element: HTMLDivElement, point: Point) => {
    const current = transformRef.current;
    if (current.scale === MIN_SCALE) {
      onPinchStartRef.current();
      measureGeometry(element);
    }
    const rect = element.getBoundingClientRect();
    const next =
      current.scale > MIN_SCALE
        ? { scale: MIN_SCALE, translateX: 0, translateY: 0 }
        : constrainTransform(
            calculatePointZoomTransform(
              current,
              { x: point.x - rect.left, y: point.y - rect.top },
              DOUBLE_TAP_SCALE,
            ),
          );

    transformRef.current = next;
    interactionBlockedRef.current = true;
    isTransitioningRef.current = true;
    setIsZoomed(next.scale > MIN_SCALE);
    element.style.transition = `transform ${DOUBLE_TAP_TRANSITION_MS}ms ease-out`;
    applyTransform();
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      isTransitioningRef.current = false;
      element.style.transition = '';
      interactionBlockedRef.current = next.scale > MIN_SCALE;
      if (next.scale === MIN_SCALE) geometryRef.current = null;
    }, DOUBLE_TAP_TRANSITION_MS);
  };

  const handleTap = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = lastTapRef.current;
    const point = { x: event.clientX, y: event.clientY };
    if (
      previous &&
      event.timeStamp - previous.time <= DOUBLE_TAP_INTERVAL_MS &&
      distanceBetween(previous, point) <= DOUBLE_TAP_DISTANCE_PX
    ) {
      lastTapRef.current = null;
      animateDoubleTap(event.currentTarget, point);
      return;
    }
    lastTapRef.current = { ...point, time: event.timeStamp };
  };

  const handlePointerUpCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const isTap = tapCandidateRef.current?.pointerId === event.pointerId;
    if (pinchStartRef.current || interactionBlockedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
    finishPointer(event);
    tapCandidateRef.current = null;
    if (isTap) handleTap(event);
  };

  const handlePointerCancelCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pinchStartRef.current || interactionBlockedRef.current) event.stopPropagation();
    finishPointer(event);
    if (tapCandidateRef.current?.pointerId === event.pointerId) {
      tapCandidateRef.current = null;
      lastTapRef.current = null;
    }
  };

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    finishPointer(event);
    if (tapCandidateRef.current?.pointerId === event.pointerId) {
      tapCandidateRef.current = null;
      lastTapRef.current = null;
    }
  };

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      pointersRef.current.clear();
      pinchStartRef.current = null;
      panStartRef.current = null;
      geometryRef.current = null;
      interactionBlockedRef.current = false;
    },
    [interactionBlockedRef],
  );

  return {
    isZoomed,
    resetZoom,
    handlers: {
      onPointerDownCapture: handlePointerDownCapture,
      onPointerMoveCapture: handlePointerMoveCapture,
      onPointerUpCapture: handlePointerUpCapture,
      onPointerCancelCapture: handlePointerCancelCapture,
      onLostPointerCapture: handleLostPointerCapture,
    },
  };
}
