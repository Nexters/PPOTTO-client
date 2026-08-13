import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';
import { cn } from '@/shared/lib/cn';

import type { DisplayItem } from '../model/photo-selection';
import { useFilmstripSync } from '../model/use-filmstrip-sync';

type PhotoFilmstripProps = {
  stickerId: string;
  photos: DisplayItem[];
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
        'flex w-full items-center snap-x snap-mandatory overflow-x-auto scrollbar-none',
        'px-[calc(50%-24px)] py-3',
      )}
    >
      {photos.map((photo, index) => {
        const isSelected = index === selectedIndex;
        const isGroupMember =
          photo.groupPosition === 'first' ||
          photo.groupPosition === 'middle' ||
          photo.groupPosition === 'last';
        const isTightGap = photo.groupPosition === 'first' || photo.groupPosition === 'middle';

        if (isGroupMember) {
          const rounded =
            photo.groupPosition === 'first'
              ? 'rounded-l-8'
              : photo.groupPosition === 'last'
                ? 'rounded-r-8'
                : 'rounded-none';

          return (
            <button
              key={photo.id}
              ref={getItemRef(index)}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                'relative h-12 w-12 shrink-0 snap-center overflow-hidden',
                rounded,
                isTightGap ? 'mr-px' : 'mr-2',
                'border',
                isSelected ? 'border-white' : 'border-transparent',
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
          );
        }

        return (
          <button
            key={photo.id}
            ref={getItemRef(index)}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              'relative mr-2 shrink-0 snap-center',
              'overflow-hidden rounded-sm',
              isSelected ? 'z-10 h-12.5 w-12.5' : 'h-10 w-10',
            )}
          >
            <StickerPhotoImage
              stickerId={stickerId}
              src={photo.imageUrl}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}
