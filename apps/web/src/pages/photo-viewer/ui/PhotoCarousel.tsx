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

  return (
    <div ref={carouselRef} className="h-full w-full overflow-hidden">
      <div className="flex h-full">
        {photos.map((photo) => (
          <div key={photo.id} className="relative h-full min-w-0 flex-[0_0_100%]">
            <StickerPhotoImage
              stickerId={stickerId}
              src={photo.imageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
