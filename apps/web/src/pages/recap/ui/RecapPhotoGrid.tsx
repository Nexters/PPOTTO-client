import { ImageMultiple } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useState } from 'react';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';
import { Skeleton } from '@/shared/ui/Skeleton';

type RecapPhotoGridProps = {
  stickerId: string;
  photos: StickerPhoto[];
  eager?: boolean;
};

export function RecapPhotoGrid({ stickerId, photos, eager = false }: RecapPhotoGridProps) {
  const { push } = useFlow();
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full justify-between">
        <span className="text-body-01 text-center whitespace-nowrap text-gray-50">
          테마 속 사진
        </span>
        <span className="text-body-01 text-center font-medium text-gray-500">{photos.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className="relative aspect-square w-full overflow-hidden rounded-8"
            onClick={() => push('PhotoViewer', { stickerId, initialIndex: String(index) })}
          >
            {!loadedIds.has(photo.id) && <Skeleton className="absolute inset-0 rounded-none" />}
            <StickerPhotoImage
              stickerId={stickerId}
              src={photo.imageUrl}
              alt=""
              fill
              sizes="33vw"
              className="object-cover"
              loading={eager ? 'eager' : 'lazy'}
              onLoad={() =>
                setLoadedIds((prev) => (prev.has(photo.id) ? prev : new Set(prev).add(photo.id)))
              }
            />
            {photo.groupPhotos.length > 0 && (
              <ImageMultiple
                width={20}
                height={20}
                viewBox="9 7 20 20"
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 6,
                  filter: 'drop-shadow(0px 2.5px 10.83px rgba(0, 0, 0, 0.5))',
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
