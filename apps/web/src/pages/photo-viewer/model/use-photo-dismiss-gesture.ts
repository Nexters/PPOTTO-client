import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import {
  calculateContainedImageRect,
  calculateReleaseVelocity,
  calculateSharedDismissTransform,
  clampDragY,
  dragYToScale,
  resolveDragAxis,
  shouldDismiss,
  toRelativeRect,
  type DragAxis,
  type DragSample,
} from './photo-dismiss-gesture';

const SETTLE_DURATION_MS = 200;
const DISMISS_DURATION_MS = 180;
const SHARED_DISMISS_DURATION_MAX_MS = 240;
const SHARED_DISMISS_DURATION_MIN_MS = 190;
const SHARED_DISMISS_MAX_VELOCITY = 1.5;
const VELOCITY_MAX_AGE_MS = 80;
const VELOCITY_SAMPLE_WINDOW_MS = 100;

function motionDuration(duration: number): number {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : duration;
}

function sharedDismissDuration(velocityY: number): number {
  const progress = Math.min(Math.max(velocityY, 0) / SHARED_DISMISS_MAX_VELOCITY, 1);
  const range = SHARED_DISMISS_DURATION_MAX_MS - SHARED_DISMISS_DURATION_MIN_MS;
  return SHARED_DISMISS_DURATION_MAX_MS - range * progress;
}

type DismissTarget = () => DOMRect | undefined;

export function usePhotoDismissGesture(
  onDismiss: () => void,
  getDismissTarget?: DismissTarget,
  isInteractionBlocked?: () => boolean,
) {
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
  const dismissOverlayRef = useRef<HTMLDivElement | null>(null);
  const isDismissingRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  const getDismissTargetRef = useRef(getDismissTarget);
  const isInteractionBlockedRef = useRef(isInteractionBlocked);

  useLayoutEffect(() => {
    onDismissRef.current = onDismiss;
    getDismissTargetRef.current = getDismissTarget;
    isInteractionBlockedRef.current = isInteractionBlocked;
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
    dismissOverlayRef.current?.remove();
    dismissOverlayRef.current = null;
  };

  const applyVisual = (dragX: number, dragY: number) => {
    const photo = gestureRef.current;
    if (!photo) return;

    const dismissProgress = Math.min(Math.max(dragY, 0) / (window.innerHeight * 0.5), 1);
    const chromeProgress = Math.min(Math.max(dragY, 0) / 80, 1);
    photo.style.transform =
      dragY === 0
        ? ''
        : `translate3d(${dragX}px, ${dragY}px, 0) scale(${dragYToScale(dragY, window.innerHeight)})`;
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

  const scheduleVisual = (dragX: number, dragY: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyVisual(dragX, dragY);
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
    applyVisual(0, 0);
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      if (gestureRef.current === photo) setTransition('');
    }, duration);
  };

  const finishDismiss = (dragX: number, velocityY: number) => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    cancelScheduledWork();
    clearPointer();

    const photo = gestureRef.current;
    if (!photo) {
      onDismissRef.current();
      return;
    }

    const viewer = viewerRef.current;
    const activeImage = photo.querySelector<HTMLImageElement>(
      '[data-photo-viewer-active-image="true"]',
    );
    const target = getDismissTargetRef.current?.();
    const source = activeImage
      ? calculateContainedImageRect(
          activeImage.getBoundingClientRect(),
          activeImage.naturalWidth,
          activeImage.naturalHeight,
        )
      : null;
    const containedTarget =
      activeImage && target
        ? calculateContainedImageRect(target, activeImage.naturalWidth, activeImage.naturalHeight)
        : null;

    if (viewer && activeImage && source && target && containedTarget) {
      const duration = motionDuration(sharedDismissDuration(velocityY));
      const crossfadeDuration = Math.max(1, duration * 0.35);
      const crossfadeDelay = Math.max(0, duration - crossfadeDuration);
      const viewerRect = viewer.getBoundingClientRect();
      const relativeSource = toRelativeRect(source, viewerRect);
      const relativeTarget = toRelativeRect(target, viewerRect);
      const relativeContainedTarget = toRelativeRect(containedTarget, viewerRect);
      const transform = calculateSharedDismissTransform(relativeSource, relativeContainedTarget);
      if (!transform) {
        onDismissRef.current();
        return;
      }
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:20';

      const sourceClone = activeImage.cloneNode() as HTMLImageElement;
      sourceClone.alt = '';
      sourceClone.removeAttribute('data-photo-viewer-active-image');
      sourceClone.style.cssText = [
        'position:absolute',
        'object-fit:fill',
        `left:${relativeSource.left}px`,
        `top:${relativeSource.top}px`,
        `width:${relativeSource.width}px`,
        `height:${relativeSource.height}px`,
        'transform-origin:0 0',
        'will-change:transform,opacity',
        `transition:transform ${duration}ms ease-in-out, opacity ${crossfadeDuration}ms ease-out ${crossfadeDelay}ms`,
      ].join(';');

      const targetClone = activeImage.cloneNode() as HTMLImageElement;
      targetClone.alt = '';
      targetClone.removeAttribute('data-photo-viewer-active-image');
      const sourceCenterX = relativeSource.left + relativeSource.width / 2;
      const sourceCenterY = relativeSource.top + relativeSource.height / 2;
      const targetCenterX = relativeTarget.left + relativeTarget.width / 2;
      const targetCenterY = relativeTarget.top + relativeTarget.height / 2;
      const targetStartScale = Math.max(
        relativeSource.width / relativeTarget.width,
        relativeSource.height / relativeTarget.height,
      );
      targetClone.style.cssText = [
        'position:absolute',
        'object-fit:cover',
        `left:${relativeTarget.left}px`,
        `top:${relativeTarget.top}px`,
        `width:${relativeTarget.width}px`,
        `height:${relativeTarget.height}px`,
        'border-radius:8px',
        'opacity:0',
        'transform-origin:center',
        `transform:translate3d(${sourceCenterX - targetCenterX}px, ${sourceCenterY - targetCenterY}px, 0) scale(${targetStartScale})`,
        'will-change:transform,opacity',
        `transition:transform ${duration}ms ease-in-out, opacity ${crossfadeDuration}ms ease-out ${crossfadeDelay}ms`,
      ].join(';');

      overlay.append(sourceClone, targetClone);
      dismissOverlayRef.current = overlay;
      viewer.append(overlay);

      viewer.style.pointerEvents = 'none';
      setTransition(`opacity ${duration}ms ease-in-out`);
      photo.style.opacity = '0';
      if (backdropRef.current) backdropRef.current.style.opacity = '0';
      if (headerRef.current) headerRef.current.style.opacity = '0';
      if (filmstripRef.current) filmstripRef.current.style.opacity = '0';

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          sourceClone.style.transform = `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) scale(${transform.scale})`;
          sourceClone.style.opacity = '0';
          targetClone.style.transform = 'translate3d(0, 0, 0) scale(1)';
          targetClone.style.opacity = '1';

          transitionTimerRef.current = window.setTimeout(() => {
            transitionTimerRef.current = null;
            overlay.remove();
            dismissOverlayRef.current = null;
            onDismissRef.current();
          }, duration);
        });
      });
      return;
    }

    const duration = motionDuration(DISMISS_DURATION_MS);
    if (viewerRef.current) viewerRef.current.style.pointerEvents = 'none';
    setTransition(`transform ${duration}ms ease-in, opacity ${duration}ms ease-in`);
    applyVisual(dragX, window.innerHeight);
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      onDismissRef.current();
    }, duration);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      pointerIdRef.current !== null ||
      isDismissingRef.current ||
      isInteractionBlockedRef.current?.()
    )
      return;
    cancelScheduledWork();

    setTransition('');

    pointerIdRef.current = event.pointerId;
    axisRef.current = 'pending';
    startRef.current = { x: event.clientX, y: event.clientY };
    velocitySamplesRef.current = [{ y: event.clientY, time: event.timeStamp }];
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      pointerIdRef.current !== event.pointerId ||
      isDismissingRef.current ||
      isInteractionBlockedRef.current?.()
    )
      return;
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
    const dragY = clampDragY(dy);
    scheduleVisual(dragY > 0 ? dx : 0, dragY);
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
      finishDismiss(event.clientX - startRef.current.x, velocityY);
    } else {
      settleBack();
    }
  };

  const cancelGesture = () => {
    if (isDismissingRef.current || pointerIdRef.current === null) return;
    cancelScheduledWork();
    clearPointer();
    setTransition('');
    applyVisual(0, 0);
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
    cancelGesture,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onLostPointerCapture: handleLostPointerCapture,
    },
  };
}
