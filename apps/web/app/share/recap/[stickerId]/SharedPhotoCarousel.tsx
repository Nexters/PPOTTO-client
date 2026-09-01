'use client';

import Image from 'next/image';
import type { RefObject } from 'react';

import type { DisplayItem } from '@/pages/photo-viewer/model/photo-selection';
import { usePhotoCarousel } from '@/pages/photo-viewer/model/use-photo-carousel';

type SharedPhotoCarouselProps = {
  photos: DisplayItem[];
  selectedIndex: number;
  jumpToSelectedRef: RefObject<boolean>;
  onSelect: (index: number) => void;
};

export function SharedPhotoCarousel({
  photos,
  selectedIndex,
  jumpToSelectedRef,
  onSelect,
}: SharedPhotoCarouselProps) {
  const carouselRef = usePhotoCarousel(selectedIndex, onSelect, jumpToSelectedRef);
  const selectedPhoto = photos[selectedIndex];
  const previousPhoto = photos[selectedIndex - 1];
  const nextPhoto = photos[selectedIndex + 1];

  return (
    <div className="relative h-full w-full">
      <div ref={carouselRef} className="h-full w-full overflow-hidden">
        <div data-photo-viewer-carousel-track className="flex h-full gap-2">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative h-full min-w-0 flex-[0_0_100%]">
              <Image
                src={photo.imageUrl}
                alt=""
                fill
                sizes="100vw"
                className="object-contain"
                data-photo-viewer-active-image={index === selectedIndex ? 'true' : undefined}
              />
            </div>
          ))}
        </div>
      </div>
      {selectedPhoto && (
        <div
          data-photo-viewer-zoom-layer
          className="pointer-events-none absolute inset-0 z-10 opacity-0"
        >
          <Image
            src={selectedPhoto.imageUrl}
            alt=""
            fill
            sizes="100vw"
            className="origin-top-left object-contain will-change-transform"
            data-photo-viewer-zoom-image
          />
        </div>
      )}
      {previousPhoto && (
        <div
          data-photo-viewer-edge-preview="previous"
          className="pointer-events-none absolute inset-0 z-10 opacity-0"
        >
          <Image
            src={previousPhoto.imageUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-contain"
          />
        </div>
      )}
      {nextPhoto && (
        <div
          data-photo-viewer-edge-preview="next"
          className="pointer-events-none absolute inset-0 z-10 opacity-0"
        >
          <Image src={nextPhoto.imageUrl} alt="" fill sizes="100vw" className="object-contain" />
        </div>
      )}
    </div>
  );
}
