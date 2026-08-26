import type { RefObject } from 'react';
import { useCallback, useRef } from 'react';

import type { ZoomEdgeDirection } from './photo-zoom';

const DEFAULT_CAROUSEL_GAP_PX = 8;

export function usePhotoZoomLayer(gestureRef: RefObject<HTMLDivElement | null>) {
  const isActiveRef = useRef(false);
  const hiddenOriginalRef = useRef<HTMLElement | null>(null);

  const getTransformElement = useCallback(
    () =>
      gestureRef.current?.querySelector<HTMLElement>('[data-photo-viewer-zoom-image]') ??
      gestureRef.current,
    [gestureRef],
  );

  const getEdgePreview = useCallback(
    (direction: ZoomEdgeDirection) =>
      gestureRef.current?.querySelector<HTMLElement>(
        `[data-photo-viewer-edge-preview="${direction}"]`,
      ) ?? null,
    [gestureRef],
  );

  const setActive = useCallback(
    (active: boolean) => {
      if (isActiveRef.current === active) return;
      const gesture = gestureRef.current;
      const layer = gesture?.querySelector<HTMLElement>('[data-photo-viewer-zoom-layer]');
      if (layer) {
        layer.style.opacity = active ? '1' : '';
        layer.style.pointerEvents = active ? 'auto' : '';
      }
      if (active) {
        const original = gesture?.querySelector<HTMLElement>(
          '[data-photo-viewer-active-image="true"]',
        );
        if (original) {
          original.style.opacity = '0';
          hiddenOriginalRef.current = original;
        }
      } else {
        if (hiddenOriginalRef.current) hiddenOriginalRef.current.style.opacity = '';
        hiddenOriginalRef.current = null;
      }
      isActiveRef.current = active;
    },
    [gestureRef],
  );

  const resetEdgePreviews = useCallback(() => {
    const previews = gestureRef.current?.querySelectorAll<HTMLElement>(
      '[data-photo-viewer-edge-preview]',
    );
    previews?.forEach((preview) => {
      preview.style.opacity = '';
      preview.style.transition = '';
      preview.style.transform = '';
    });
  }, [gestureRef]);

  const measureCarouselGap = useCallback(() => {
    const track = gestureRef.current?.querySelector<HTMLElement>(
      '[data-photo-viewer-carousel-track]',
    );
    if (!track) return DEFAULT_CAROUSEL_GAP_PX;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap);
    return Number.isFinite(gap) ? gap : DEFAULT_CAROUSEL_GAP_PX;
  }, [gestureRef]);

  return {
    getTransformElement,
    getEdgePreview,
    measureCarouselGap,
    resetEdgePreviews,
    setActive,
  };
}
