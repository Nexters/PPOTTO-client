'use client';

import { useFlow } from '@stackflow/react';
import { useState } from 'react';

import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { StickerPhotoImage } from '@/entities/sticker/ui/StickerPhotoImage';

import {
  buildDisplayList,
  findFlatIndex,
  getAdjacentSelection,
  resolveFilmstripSelection,
  type PhotoSelection,
} from './model/photo-selection';
import { useSwipeNavigation } from './model/use-swipe-navigation';
import { PhotoFilmstrip } from './ui/PhotoFilmstrip';
import { PhotoViewerHeader } from './ui/PhotoViewerHeader';

type PhotoViewerPageProps = {
  stickerId: string;
  initialIndex: string;
};

export function PhotoViewerPage({ stickerId, initialIndex }: PhotoViewerPageProps) {
  const { data } = useStickerQuery(stickerId);
  const [selection, setSelection] = useState<PhotoSelection>({
    topIndex: Number(initialIndex),
    subIndex: 0,
  });
  const { pop } = useFlow();

  const displayList = data ? buildDisplayList(data.photos, selection.topIndex) : [];
  const flatIndex = findFlatIndex(displayList, selection);
  const selectedPhoto = displayList[flatIndex];

  const handleFilmstripSelect = (newFlatIndex: number) => {
    if (!data) return;
    setSelection((prev) => resolveFilmstripSelection(data.photos, prev, newFlatIndex));
  };

  const swipeHandlers = useSwipeNavigation((direction) => {
    if (!data) return;
    setSelection((prev) => getAdjacentSelection(data.photos, prev, direction));
  });

  if (!data) return null;

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
          photos={displayList}
          selectedIndex={flatIndex}
          onSelect={handleFilmstripSelect}
        />
      </div>
    </div>
  );
}
