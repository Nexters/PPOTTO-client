'use client';

import { useState } from 'react';
import Image from 'next/image';

import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';

import { PhotoFilmstrip } from './ui/PhotoFilmstrip';
import { PhotoViewerHeader } from './ui/PhotoViewerHeader';

type PhotoViewerPageProps = {
  stickerId: string;
  initialIndex: string;
  onBack: () => void;
};

export function PhotoViewerPage({ stickerId, initialIndex, onBack }: PhotoViewerPageProps) {
  const { data } = useStickerQuery(stickerId);
  const [selectedIndex, setSelectedIndex] = useState(Number(initialIndex));

  if (!data) return null;

  const photos = data.photos;
  const selectedPhoto = photos[selectedIndex];

  return (
    <div className="flex min-h-full w-full flex-col bg-black pt-16 pb-16">
      <PhotoViewerHeader onBack={onBack} />
      <div className="mt-4 flex flex-1 flex-col gap-11">
        <div className="relative w-full flex-1">
          {selectedPhoto && (
            <Image src={selectedPhoto.imageUrl} alt="" fill className="object-contain" />
          )}
        </div>
        <PhotoFilmstrip photos={photos} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
      </div>
    </div>
  );
}
