'use client';

import { Close } from '@ppotto/assets';
import { useRef, useState } from 'react';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';
import {
  buildDisplayList,
  buildExpandedDisplayList,
  findFlatIndex,
  type PhotoSelection,
  resolveFilmstripSelection,
} from '@/pages/photo-viewer/model/photo-selection';

import { SharedPhotoCarousel } from './SharedPhotoCarousel';
import { SharedPhotoFilmstrip } from './SharedPhotoFilmstrip';

type SharedPhotoViewerProps = {
  photos: StickerPhoto[];
  initialIndex: number;
  onClose: () => void;
};

export function SharedPhotoViewer({ photos, initialIndex, onClose }: SharedPhotoViewerProps) {
  const [selection, setSelection] = useState<PhotoSelection>({
    topIndex: initialIndex,
    subIndex: 0,
  });
  const jumpToSelectedRef = useRef(false);

  const filmstripPhotos = buildDisplayList(photos, selection.topIndex);
  const filmstripIndex = findFlatIndex(filmstripPhotos, selection);
  const carouselPhotos = buildExpandedDisplayList(photos);
  const carouselIndex = findFlatIndex(carouselPhotos, selection);

  const handleFilmstripSelect = (newFlatIndex: number) => {
    const nextSelection = resolveFilmstripSelection(photos, selection, newFlatIndex);
    if (
      nextSelection.topIndex !== selection.topIndex ||
      nextSelection.subIndex !== selection.subIndex
    ) {
      setSelection(nextSelection);
    }
  };

  const handleCarouselSelect = (index: number) => {
    const photo = carouselPhotos[index];
    if (photo && (photo.topIndex !== selection.topIndex || photo.subIndex !== selection.subIndex)) {
      setSelection({ topIndex: photo.topIndex, subIndex: photo.subIndex });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div
        className="relative z-30 flex w-full justify-end px-6"
        style={{
          paddingTop: 'calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 0.75rem)',
        }}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-gray-800"
        >
          <Close color="white" />
        </button>
      </div>
      <div className="relative z-20 min-h-0 w-full flex-1">
        <SharedPhotoCarousel
          photos={carouselPhotos}
          selectedIndex={carouselIndex}
          jumpToSelectedRef={jumpToSelectedRef}
          onSelect={handleCarouselSelect}
        />
      </div>
      <div className="relative z-30">
        <SharedPhotoFilmstrip
          photos={filmstripPhotos}
          selectedIndex={filmstripIndex}
          onSelect={handleFilmstripSelect}
        />
      </div>
    </div>
  );
}
