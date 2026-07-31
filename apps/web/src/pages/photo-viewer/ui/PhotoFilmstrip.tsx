import Image from 'next/image';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import { cn } from '@/shared/lib/cn';

type PhotoFilmstripProps = {
  photos: StickerPhoto[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function PhotoFilmstrip({ photos, selectedIndex, onSelect }: PhotoFilmstripProps) {
  return (
    <div className="flex w-full gap-2 overflow-x-auto py-3">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            'relative h-12 w-12 shrink-0 overflow-hidden rounded-8 border',
            index === selectedIndex ? 'border-gray-50' : 'border-transparent',
          )}
        >
          <Image src={photo.imageUrl} alt="" fill sizes="48px" className="object-cover" />
        </button>
      ))}
    </div>
  );
}
