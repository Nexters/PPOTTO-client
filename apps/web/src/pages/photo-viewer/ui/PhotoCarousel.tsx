import type { ReactNode, RefObject } from 'react';

import type { DisplayItem } from '../model/photo-selection';
import { usePhotoCarousel } from '../model/use-photo-carousel';

export type PhotoCarouselImageProps = {
  alt: string;
  fill: true;
  sizes: string;
  className: string;
  'data-photo-viewer-active-image'?: string;
  'data-photo-viewer-zoom-image'?: boolean;
};

type PhotoCarouselProps = {
  photos: DisplayItem[];
  selectedIndex: number;
  jumpToSelectedRef: RefObject<boolean>;
  onSelect: (index: number) => void;
  renderImage: (photo: DisplayItem, props: PhotoCarouselImageProps) => ReactNode;
};

export function PhotoCarousel({
  photos,
  selectedIndex,
  jumpToSelectedRef,
  onSelect,
  renderImage,
}: PhotoCarouselProps) {
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
              {renderImage(photo, {
                alt: '',
                fill: true,
                sizes: '100vw',
                className: 'object-contain',
                'data-photo-viewer-active-image': index === selectedIndex ? 'true' : undefined,
              })}
            </div>
          ))}
        </div>
      </div>
      {selectedPhoto && (
        <div
          data-photo-viewer-zoom-layer
          className="pointer-events-none absolute inset-0 z-10 opacity-0"
        >
          {renderImage(selectedPhoto, {
            alt: '',
            fill: true,
            sizes: '100vw',
            className: 'origin-top-left object-contain will-change-transform',
            'data-photo-viewer-zoom-image': true,
          })}
        </div>
      )}
      {previousPhoto && (
        <div
          data-photo-viewer-edge-preview="previous"
          className="pointer-events-none absolute inset-0 z-10 opacity-0"
        >
          {renderImage(previousPhoto, {
            alt: '',
            fill: true,
            sizes: '100vw',
            className: 'object-contain',
          })}
        </div>
      )}
      {nextPhoto && (
        <div
          data-photo-viewer-edge-preview="next"
          className="pointer-events-none absolute inset-0 z-10 opacity-0"
        >
          {renderImage(nextPhoto, {
            alt: '',
            fill: true,
            sizes: '100vw',
            className: 'object-contain',
          })}
        </div>
      )}
    </div>
  );
}
