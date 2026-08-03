'use client';

import { useFlow } from '@stackflow/react';
import { useState } from 'react';
import Image from 'next/image';

import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';

import { useSwipeNavigation } from './model/use-swipe-navigation';
import { PhotoFilmstrip } from './ui/PhotoFilmstrip';
import { PhotoViewerHeader } from './ui/PhotoViewerHeader';

type PhotoViewerPageProps = {
  stickerId: string;
  initialIndex: string;
};

export function PhotoViewerPage({ stickerId, initialIndex }: PhotoViewerPageProps) {
  const { data, refetch } = useStickerQuery(stickerId);
  const [selectedIndex, setSelectedIndex] = useState(Number(initialIndex));
  const swipeHandlers = useSwipeNavigation(data?.photos.length ?? 0, setSelectedIndex);
  const { pop } = useFlow();

  if (!data) return null;

  const photos = data.photos;
  const selectedPhoto = photos[selectedIndex];

  return (
    <div className="flex min-h-full w-full flex-col bg-black pt-16 pb-16">
      <PhotoViewerHeader onBack={() => pop()} />
      <div className="mt-4 flex flex-1 flex-col gap-11">
        <div className="relative w-full flex-1" {...swipeHandlers}>
          {selectedPhoto && (
            <Image
              src={selectedPhoto.imageUrl}
              alt=""
              fill
              className="object-contain"
              onError={() => refetch()}
            />
          )}
        </div>
        <PhotoFilmstrip
          photos={photos}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onImageError={() => refetch()}
        />
      </div>
    </div>
  );
}
