'use client';

import { useFlow } from '@stackflow/react';
import { useState } from 'react';

import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { cn } from '@/shared/lib/cn';

import {
  buildDisplayList,
  buildExpandedDisplayList,
  findFlatIndex,
  resolveFilmstripSelection,
  type PhotoSelection,
} from './model/photo-selection';
import { usePhotoDismissGesture } from './model/use-photo-dismiss-gesture';
import { PhotoCarousel } from './ui/PhotoCarousel';
import { PhotoFilmstrip } from './ui/PhotoFilmstrip';
import { PhotoViewerHeader } from './ui/PhotoViewerHeader';

type PhotoViewerPageProps = {
  stickerId: string;
  initialIndex: string;
};

export function PhotoViewerPage({ stickerId, initialIndex }: PhotoViewerPageProps) {
  const { data } = useStickerQuery(stickerId);
  const [selection, setSelection] = useState<PhotoSelection>({
    topIndex: Number(initialIndex),
    subIndex: 0,
  });
  const { pop } = useFlow();
  const {
    gestureRef,
    viewerRef,
    backdropRef,
    headerRef,
    filmstripRef,
    handlers: dismissHandlers,
  } = usePhotoDismissGesture(() => pop());

  const filmstripPhotos = data ? buildDisplayList(data.photos, selection.topIndex) : [];
  const filmstripIndex = findFlatIndex(filmstripPhotos, selection);
  const carouselPhotos = data ? buildExpandedDisplayList(data.photos) : [];
  const carouselIndex = findFlatIndex(carouselPhotos, selection);

  const handleFilmstripSelect = (newFlatIndex: number) => {
    if (!data) return;
    setSelection((prev) => resolveFilmstripSelection(data.photos, prev, newFlatIndex));
  };

  const handleCarouselSelect = (index: number) => {
    const photo = carouselPhotos[index];
    if (photo) setSelection({ topIndex: photo.topIndex, subIndex: photo.subIndex });
  };

  if (!data) return null;

  return (
    <div ref={viewerRef} className="relative flex h-full w-full flex-col overflow-hidden">
      <div ref={backdropRef} className="pointer-events-none absolute inset-0 bg-black" />
      <div ref={headerRef} className="relative z-10 will-change-opacity">
        <PhotoViewerHeader onBack={() => pop()} />
      </div>
      <div className={cn('relative z-10 mt-4 flex', 'min-h-0 flex-1 flex-col gap-11')}>
        <div
          ref={gestureRef}
          className={cn('relative min-h-0 w-full flex-1', 'touch-none will-change-transform')}
          {...dismissHandlers}
        >
          <PhotoCarousel
            stickerId={stickerId}
            photos={carouselPhotos}
            selectedIndex={carouselIndex}
            onSelect={handleCarouselSelect}
          />
        </div>
        <div ref={filmstripRef} className="will-change-opacity">
          <PhotoFilmstrip
            stickerId={stickerId}
            photos={filmstripPhotos}
            selectedIndex={filmstripIndex}
            onSelect={handleFilmstripSelect}
          />
        </div>
      </div>
    </div>
  );
}
