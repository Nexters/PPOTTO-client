import { ImageMultiple } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useState } from 'react';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';
import { cn } from '@/shared/lib/cn';
import { Skeleton } from '@/shared/ui/Skeleton';

type RecapPhotoGridProps = {
  stickerId: string;
  photos: StickerPhoto[];
  eager?: boolean;
};

type RecapPhotoTileProps = {
  stickerId: string;
  photo: StickerPhoto;
  eager: boolean;
  onClick: () => void;
};

function RecapPhotoTile({ stickerId, photo, eager, onClick }: RecapPhotoTileProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  // eager는 공유 카드 캡처용 오프스크린 렌더 — 스켈레톤/페이드가 캡처에 섞이면 안 된다
  const showSkeleton = !eager && !isLoaded;

  return (
    <button
      type="button"
      className="rounded-8 relative aspect-square w-full overflow-hidden bg-gray-900"
      onClick={onClick}
    >
      {showSkeleton && <Skeleton className="absolute inset-0 rounded-none" />}
      <StickerPhotoImage
        stickerId={stickerId}
        src={photo.imageUrl}
        alt=""
        fill
        sizes="33vw"
        className={cn(
          'object-cover',
          !eager && 'transition-opacity duration-200',
          showSkeleton ? 'opacity-0' : 'opacity-100',
        )}
        loading={eager ? 'eager' : 'lazy'}
        onLoad={() => setIsLoaded(true)}
      />
      {photo.groupPhotos.length > 0 && (
        <ImageMultiple
          width={20}
          height={20}
          viewBox="9 7 20 20"
          color="#fff"
          style={{
            position: 'absolute',
            top: 7,
            right: 6,
            filter: 'drop-shadow(0px 2.5px 10.83px rgba(0, 0, 0, 0.5))',
          }}
        />
      )}
    </button>
  );
}

export function RecapPhotoGrid({ stickerId, photos, eager = false }: RecapPhotoGridProps) {
  const { push } = useFlow();

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
          <RecapPhotoTile
            key={photo.id}
            stickerId={stickerId}
            photo={photo}
            eager={eager}
            onClick={() => push('PhotoViewer', { stickerId, initialIndex: String(index) })}
          />
        ))}
      </div>
    </div>
  );
}
