'use client';

import Image from 'next/image';
import { useCallback, useLayoutEffect, useRef } from 'react';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import { usePhotoDismissGesture } from '@/pages/photo-viewer/model/use-photo-dismiss-gesture';
import { usePhotoViewerSelection } from '@/pages/photo-viewer/model/use-photo-viewer-selection';
import { usePhotoZoomGesture } from '@/pages/photo-viewer/model/use-photo-zoom-gesture';
import { PhotoCarousel } from '@/pages/photo-viewer/ui/PhotoCarousel';
import { PhotoFilmstrip } from '@/pages/photo-viewer/ui/PhotoFilmstrip';
import { PhotoViewerHeader } from '@/pages/photo-viewer/ui/PhotoViewerHeader';
import { cn } from '@/shared/lib/cn';

type SharedPhotoViewerProps = {
  photos: StickerPhoto[];
  initialIndex: number;
  onClose: () => void;
};

export function SharedPhotoViewer({ photos, initialIndex, onClose }: SharedPhotoViewerProps) {
  const zoomInteractionBlockedRef = useRef(false);
  // 순환 의존 회피용 ref
  const resetZoomRef = useRef<() => void>(() => {});

  const {
    selection,
    filmstripPhotos,
    filmstripIndex,
    carouselPhotos,
    carouselIndex,
    jumpCarouselSelectionRef,
    handleFilmstripSelect,
    handleCarouselSelect,
    handleZoomEdgeNavigate,
  } = usePhotoViewerSelection({
    photos,
    initialTopIndex: initialIndex,
    onSelectionChange: () => resetZoomRef.current(),
  });

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

  const { resetZoom, handlers: zoomHandlers } = usePhotoZoomGesture(
    gestureRef,
    zoomInteractionBlockedRef,
    cancelDismissGesture,
    handleZoomEdgeNavigate,
    isVerticalDragActiveRef,
  );

  useLayoutEffect(() => {
    resetZoomRef.current = resetZoom;
  });

  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={viewerRef}
        className={cn(
          'relative mx-auto flex h-full w-full max-w-112.5',
          'flex-col overflow-hidden',
        )}
      >
        <div ref={backdropRef} className="pointer-events-none absolute inset-0 bg-black" />
        <div ref={headerRef} className="relative z-30 will-change-opacity">
          <PhotoViewerHeader onBack={onClose} />
        </div>
        <div className={cn('relative z-10 mt-4 flex', 'min-h-0 flex-1 flex-col gap-11')}>
          <div
            ref={gestureRef}
            className={cn(
              'relative z-20 min-h-0 w-full flex-1 origin-top-left',
              'touch-none will-change-transform',
            )}
            {...dismissHandlers}
            {...zoomHandlers}
          >
            <PhotoCarousel
              photos={carouselPhotos}
              selectedIndex={carouselIndex}
              jumpToSelectedRef={jumpCarouselSelectionRef}
              onSelect={handleCarouselSelect}
              renderImage={(photo, props) => <Image src={photo.imageUrl} {...props} alt="" />}
            />
          </div>
          <div ref={filmstripRef} className="relative z-30 will-change-opacity">
            <PhotoFilmstrip
              photos={filmstripPhotos}
              selectedIndex={filmstripIndex}
              onSelect={handleFilmstripSelect}
              renderImage={(photo, props) => <Image src={photo.imageUrl} {...props} alt="" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
