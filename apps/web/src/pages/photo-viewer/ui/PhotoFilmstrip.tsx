import { useEffect, useRef } from 'react';
import Image from 'next/image';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import { cn } from '@/shared/lib/cn';

type PhotoFilmstripProps = {
  photos: StickerPhoto[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function PhotoFilmstrip({ photos, selectedIndex, onSelect }: PhotoFilmstripProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isFirstScroll = useRef(true);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({
      behavior: isFirstScroll.current ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
    isFirstScroll.current = false;
  }, [selectedIndex]);

  return (
    <div className="flex w-full gap-2 overflow-x-auto px-[calc(50%-24px)] py-3 scrollbar-none">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
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
