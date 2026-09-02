'use client';

import { useFlow } from '@stackflow/react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';
import { cn } from '@/shared/lib/cn';

import { usePhotoDismissGesture } from './model/use-photo-dismiss-gesture';
import { usePhotoViewerSelection } from './model/use-photo-viewer-selection';
import { usePhotoZoomGesture } from './model/use-photo-zoom-gesture';
import { PhotoCarousel } from './ui/PhotoCarousel';
import { PhotoFilmstrip } from './ui/PhotoFilmstrip';
import { PhotoViewerHeader } from './ui/PhotoViewerHeader';

type PhotoViewerPageProps = {
  stickerId: string;
  initialIndex: string;
};

export function PhotoViewerPage({ stickerId, initialIndex }: PhotoViewerPageProps) {
  const { data } = useStickerQuery(stickerId);
  const { pop } = useFlow();
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
    photos: data?.photos ?? [],
    initialTopIndex: Number(initialIndex),
    onSelectionChange: () => resetZoomRef.current(),
  });

  const getDismissTarget = useCallback(() => {
    const recap = document.querySelector('.recap-app-screen');
    const candidates = recap?.querySelectorAll<HTMLElement>(
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
  } = usePhotoDismissGesture(
    () => pop(),
    getDismissTarget,
    () => zoomInteractionBlockedRef.current,
  );
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

  useEffect(() => {
    document.documentElement.classList.add('photo-viewer-reveal-recap');
    return () => document.documentElement.classList.remove('photo-viewer-reveal-recap');
  }, []);

  if (!data) return null;

  return (
    <div ref={viewerRef} className="relative flex h-full w-full flex-col overflow-hidden">
      <div ref={backdropRef} className="pointer-events-none absolute inset-0 bg-black" />
      <div ref={headerRef} className="relative z-30 will-change-opacity">
        <PhotoViewerHeader onBack={() => pop()} />
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
            renderImage={(photo, props) => (
              <StickerPhotoImage stickerId={stickerId} src={photo.imageUrl} {...props} />
            )}
          />
        </div>
        <div ref={filmstripRef} className="relative z-30 will-change-opacity">
          <PhotoFilmstrip
            photos={filmstripPhotos}
            selectedIndex={filmstripIndex}
            onSelect={handleFilmstripSelect}
            renderImage={(photo, props) => (
              <StickerPhotoImage stickerId={stickerId} src={photo.imageUrl} {...props} />
            )}
          />
        </div>
      </div>
    </div>
  );
}
