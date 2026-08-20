import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import {
  calculateReleaseVelocity,
  clampDragY,
  dragYToScale,
  resolveDragAxis,
  shouldDismiss,
  type DragAxis,
  type DragSample,
} from './photo-dismiss-gesture';

const SETTLE_DURATION_MS = 200;
const DISMISS_DURATION_MS = 180;
const VELOCITY_MAX_AGE_MS = 80;
const VELOCITY_SAMPLE_WINDOW_MS = 100;

function motionDuration(duration: number): number {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : duration;
}

export function usePhotoDismissGesture(onDismiss: () => void) {
  const gestureRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<DragAxis>('pending');
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const velocitySamplesRef = useRef<DragSample[]>([]);
  const rafRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const isDismissingRef = useRef(false);
  const onDismissRef = useRef(onDismiss);

  useLayoutEffect(() => {
    onDismissRef.current = onDismiss;
  });

  const cancelScheduledWork = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  };

  const applyVisual = (dragY: number) => {
    const photo = gestureRef.current;
    if (!photo) return;

    const dismissProgress = Math.min(Math.max(dragY, 0) / (window.innerHeight * 0.5), 1);
    const chromeProgress = Math.min(Math.max(dragY, 0) / 80, 1);
    photo.style.transform =
      dragY === 0 ? '' : `translateY(${dragY}px) scale(${dragYToScale(dragY)})`;
    if (backdropRef.current) {
      backdropRef.current.style.opacity = dragY === 0 ? '' : String(1 - dismissProgress);
    }
    const chromeOpacity = dragY === 0 ? '' : String(1 - chromeProgress);
    if (headerRef.current) headerRef.current.style.opacity = chromeOpacity;
    if (filmstripRef.current) filmstripRef.current.style.opacity = chromeOpacity;
  };

  const setTransition = (transition: string) => {
    const elements = [
      gestureRef.current,
      backdropRef.current,
      headerRef.current,
      filmstripRef.current,
    ];
    elements.forEach((element) => {
      if (element) element.style.transition = transition;
    });
  };

  const scheduleVisual = (dragY: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyVisual(dragY);
    });
  };

  const clearPointer = () => {
    axisRef.current = 'pending';
    pointerIdRef.current = null;
    velocitySamplesRef.current = [];
  };

  const settleBack = () => {
    cancelScheduledWork();
    clearPointer();

    const photo = gestureRef.current;
    if (!photo) return;
    const duration = motionDuration(SETTLE_DURATION_MS);
    setTransition(`transform ${duration}ms ease-out, opacity ${duration}ms ease-out`);
    applyVisual(0);
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      if (gestureRef.current === photo) setTransition('');
    }, duration);
  };

  const finishDismiss = () => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    cancelScheduledWork();
    clearPointer();

    const photo = gestureRef.current;
    if (!photo) {
      onDismissRef.current();
      return;
    }

    const duration = motionDuration(DISMISS_DURATION_MS);
    if (viewerRef.current) viewerRef.current.style.pointerEvents = 'none';
    setTransition(`transform ${duration}ms ease-in, opacity ${duration}ms ease-in`);
    applyVisual(window.innerHeight);
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      onDismissRef.current();
    }, duration);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null || isDismissingRef.current) return;
    cancelScheduledWork();

    setTransition('');

    pointerIdRef.current = event.pointerId;
    axisRef.current = 'pending';
    startRef.current = { x: event.clientX, y: event.clientY };
    velocitySamplesRef.current = [{ y: event.clientY, time: event.timeStamp }];
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId || isDismissingRef.current) return;
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;

    if (axisRef.current === 'pending') {
      axisRef.current = resolveDragAxis(dx, dy);
      if (axisRef.current === 'vertical') event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (axisRef.current === 'horizontal') return;
    if (axisRef.current !== 'vertical') return;

    event.preventDefault();
    velocitySamplesRef.current.push({ y: event.clientY, time: event.timeStamp });
    velocitySamplesRef.current = velocitySamplesRef.current.filter(
      (sample) => event.timeStamp - sample.time <= VELOCITY_SAMPLE_WINDOW_MS,
    );
    scheduleVisual(clampDragY(dy));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (axisRef.current !== 'vertical') {
      clearPointer();
      return;
    }

    const dragY = clampDragY(event.clientY - startRef.current.y);
    const velocityY = calculateReleaseVelocity(
      velocitySamplesRef.current,
      event.timeStamp,
      VELOCITY_MAX_AGE_MS,
    );

    if (dragY > 0 && shouldDismiss(dragY, window.innerHeight, velocityY)) {
      finishDismiss();
    } else {
      settleBack();
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (axisRef.current === 'vertical') settleBack();
    else clearPointer();
  };

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    // setPointerCapture가 자식의 암묵적 캡처를 가져올 때 자식에서 발생하는 이벤트 무시
    if (event.target !== event.currentTarget) return;
    if (pointerIdRef.current === event.pointerId) settleBack();
  };

  useEffect(
    () => () => {
      cancelScheduledWork();
    },
    [],
  );

  return {
    gestureRef,
    viewerRef,
    backdropRef,
    headerRef,
    filmstripRef,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onLostPointerCapture: handleLostPointerCapture,
    },
  };
}
