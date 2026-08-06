import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';
import { cn } from '@/shared/lib/cn';

import { useFilmstripSync } from '../model/use-filmstrip-sync';

type PhotoFilmstripProps = {
  stickerId: string;
  photos: StickerPhoto[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function PhotoFilmstrip({
  stickerId,
  photos,
  selectedIndex,
  onSelect,
}: PhotoFilmstripProps) {
  const { containerRef, getItemRef } = useFilmstripSync(selectedIndex, onSelect);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex w-full snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-none',
        'px-[calc(50%-24px)] py-3',
      )}
    >
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          ref={getItemRef(index)}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            'relative h-12 w-12 shrink-0 snap-center overflow-hidden rounded-8',
            'border',
            index === selectedIndex ? 'border-gray-50' : 'border-transparent',
          )}
        >
          <StickerPhotoImage
            stickerId={stickerId}
            src={photo.imageUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        </button>
      ))}
    </div>
  );
}
