import { useFlow } from '@stackflow/react';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';

type RecapPhotoGridProps = {
  stickerId: string;
  photos: StickerPhoto[];
};

export function RecapPhotoGrid({ stickerId, photos }: RecapPhotoGridProps) {
  const { push } = useFlow();

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full justify-between">
        <span className="text-body-01 text-center text-gray-50">테마 속 사진</span>
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
            <StickerPhotoImage
              stickerId={stickerId}
              src={photo.imageUrl}
              alt=""
              fill
              sizes="33vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
