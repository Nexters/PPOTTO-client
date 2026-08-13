'use client';

import { useFlow } from '@stackflow/react';
import { useState } from 'react';

import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';

import { useSwipeNavigation } from './model/use-swipe-navigation';
import { PhotoFilmstrip } from './ui/PhotoFilmstrip';
import { PhotoViewerHeader } from './ui/PhotoViewerHeader';

type PhotoViewerPageProps = {
  stickerId: string;
  initialIndex: string;
};

export function PhotoViewerPage({ stickerId, initialIndex }: PhotoViewerPageProps) {
  const { data } = useStickerQuery(stickerId);
  const [selectedIndex, setSelectedIndex] = useState(Number(initialIndex));
  const swipeHandlers = useSwipeNavigation(data?.photos.length ?? 0, setSelectedIndex);
  const { pop } = useFlow();

  if (!data) return null;

  const photos = data.photos;
  const selectedPhoto = photos[selectedIndex];

  return (
    <div className="flex min-h-full w-full flex-col">
      <PhotoViewerHeader onBack={() => pop()} />
      <div className="mt-4 flex flex-1 flex-col gap-11">
        <div className="relative w-full flex-1" {...swipeHandlers}>
          {selectedPhoto && (
            <StickerPhotoImage
              stickerId={stickerId}
              src={selectedPhoto.imageUrl}
              alt=""
              fill
              className="object-contain"
            />
          )}
        </div>
        <PhotoFilmstrip
          stickerId={stickerId}
          photos={photos}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      </div>
    </div>
  );
}
