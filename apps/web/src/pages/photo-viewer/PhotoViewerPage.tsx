'use client';

import { useState } from 'react';
import Image from 'next/image';

import { stickerFixture } from '@/entities/sticker/api/__fixtures__/sticker.fixture';

import { PhotoFilmstrip } from './ui/PhotoFilmstrip';
import { PhotoViewerHeader } from './ui/PhotoViewerHeader';

type PhotoViewerPageProps = {
  stickerId: string;
  initialIndex: string;
  onBack: () => void;
};

export function PhotoViewerPage({
  stickerId: _stickerId,
  initialIndex,
  onBack,
}: PhotoViewerPageProps) {
  const photos = stickerFixture.photos;
  const [selectedIndex, setSelectedIndex] = useState(Number(initialIndex));
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
