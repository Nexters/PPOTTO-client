import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';

import type { DisplayItem } from '../model/photo-selection';
import { usePhotoCarousel } from '../model/use-photo-carousel';

type PhotoCarouselProps = {
  stickerId: string;
  photos: DisplayItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function PhotoCarousel({ stickerId, photos, selectedIndex, onSelect }: PhotoCarouselProps) {
  const carouselRef = usePhotoCarousel(selectedIndex, onSelect);
  const selectedPhoto = photos[selectedIndex];

  return (
    <div className="relative h-full w-full">
      <div ref={carouselRef} className="h-full w-full overflow-hidden">
        <div className="flex h-full gap-2">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative h-full min-w-0 flex-[0_0_100%]">
              <StickerPhotoImage
                stickerId={stickerId}
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
          <StickerPhotoImage
            stickerId={stickerId}
            src={selectedPhoto.imageUrl}
            alt=""
            fill
            sizes="100vw"
            className="origin-top-left object-contain will-change-transform"
            data-photo-viewer-zoom-image
          />
        </div>
      )}
    </div>
  );
}
