'use client';

import { Close } from '@ppotto/assets';
import { useCallback, useRef, useState } from 'react';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import {
  buildDisplayList,
  buildExpandedDisplayList,
  findFlatIndex,
  type PhotoSelection,
  resolveFilmstripSelection,
} from '@/pages/photo-viewer/model/photo-selection';
import type { ZoomEdgeDirection } from '@/pages/photo-viewer/model/photo-zoom';
import { usePhotoDismissGesture } from '@/pages/photo-viewer/model/use-photo-dismiss-gesture';
import { usePhotoZoomGesture } from '@/pages/photo-viewer/model/use-photo-zoom-gesture';
import { cn } from '@/shared/lib/cn';

import { SharedPhotoCarousel } from './SharedPhotoCarousel';
import { SharedPhotoFilmstrip } from './SharedPhotoFilmstrip';

type SharedPhotoViewerProps = {
  photos: StickerPhoto[];
  initialIndex: number;
  onClose: () => void;
};

export function SharedPhotoViewer({ photos, initialIndex, onClose }: SharedPhotoViewerProps) {
  const [selection, setSelection] = useState<PhotoSelection>({
    topIndex: initialIndex,
    subIndex: 0,
  });
  const zoomInteractionBlockedRef = useRef(false);
  const jumpCarouselSelectionRef = useRef(false);

  const filmstripPhotos = buildDisplayList(photos, selection.topIndex);
  const filmstripIndex = findFlatIndex(filmstripPhotos, selection);
  const carouselPhotos = buildExpandedDisplayList(photos);
  const carouselIndex = findFlatIndex(carouselPhotos, selection);

  const getDismissTarget = useCallback(() => {
    const grid = document.querySelector('.recap-share-photo-grid');
    const candidates = grid?.querySelectorAll<HTMLElement>(
      `[data-recap-photo-index="${selection.topIndex}"]`,
    );

    return Array.from(candidates ?? [])
      .map((element) => element.getBoundingClientRect())
      .find(
        (rect) =>
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth,
      );
  }, [selection.topIndex]);

  const {
    gestureRef,
    viewerRef,
    backdropRef,
    headerRef,
    filmstripRef,
    isVerticalDragActiveRef,
    cancelGesture: cancelDismissGesture,
    handlers: dismissHandlers,
  } = usePhotoDismissGesture(onClose, getDismissTarget, () => zoomInteractionBlockedRef.current);

  const handleZoomEdgeNavigate = useCallback(
    (direction: ZoomEdgeDirection) => {
      const nextIndex = carouselIndex + (direction === 'next' ? 1 : -1);
      const photo = carouselPhotos[nextIndex];
      if (!photo) return;
      jumpCarouselSelectionRef.current = true;
      setSelection({ topIndex: photo.topIndex, subIndex: photo.subIndex });
    },
    [carouselIndex, carouselPhotos],
  );

  const { resetZoom, handlers: zoomHandlers } = usePhotoZoomGesture(
    gestureRef,
    zoomInteractionBlockedRef,
    cancelDismissGesture,
    handleZoomEdgeNavigate,
    isVerticalDragActiveRef,
  );

  const handleFilmstripSelect = (newFlatIndex: number) => {
    const nextSelection = resolveFilmstripSelection(photos, selection, newFlatIndex);
    if (
      nextSelection.topIndex !== selection.topIndex ||
      nextSelection.subIndex !== selection.subIndex
    ) {
      resetZoom();
      setSelection(nextSelection);
    }
  };

  const handleCarouselSelect = (index: number) => {
    const photo = carouselPhotos[index];
    if (photo && (photo.topIndex !== selection.topIndex || photo.subIndex !== selection.subIndex)) {
      resetZoom();
      setSelection({ topIndex: photo.topIndex, subIndex: photo.subIndex });
    }
  };

  return (
    <div ref={viewerRef} className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      <div ref={backdropRef} className="pointer-events-none absolute inset-0 bg-black" />
      <div
        ref={headerRef}
        className="relative z-30 flex w-full justify-end px-6 will-change-opacity"
        style={{
          paddingTop: 'calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 0.75rem)',
        }}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-gray-800"
        >
          <Close color="white" />
        </button>
      </div>
      <div
        ref={gestureRef}
        className={cn(
          'relative z-20 min-h-0 w-full flex-1 origin-top-left',
          'touch-none will-change-transform',
        )}
        {...dismissHandlers}
        {...zoomHandlers}
      >
        <SharedPhotoCarousel
          photos={carouselPhotos}
          selectedIndex={carouselIndex}
          jumpToSelectedRef={jumpCarouselSelectionRef}
          onSelect={handleCarouselSelect}
        />
      </div>
      <div ref={filmstripRef} className="relative z-30 will-change-opacity">
        <SharedPhotoFilmstrip
          photos={filmstripPhotos}
          selectedIndex={filmstripIndex}
          onSelect={handleFilmstripSelect}
        />
      </div>
    </div>
  );
}
