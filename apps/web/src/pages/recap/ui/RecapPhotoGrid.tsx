import { ImageMultiple } from '@ppotto/assets';
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
        <span className="text-body-01 font-semibold text-gray-50">테마 속 사진</span>
        <span className="text-body-01 text-gray-500">{photos.length}</span>
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
            {photo.group && (
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
