'use client';

import { Close } from '@ppotto/assets';
import Image from 'next/image';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';

type SharedPhotoViewerProps = {
  photos: StickerPhoto[];
  initialIndex: number;
  onClose: () => void;
};

export function SharedPhotoViewer({ photos, initialIndex, onClose }: SharedPhotoViewerProps) {
  const photo = photos[initialIndex];
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div
        className="flex w-full justify-end px-6"
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
      <div className="relative min-h-0 flex-1">
        <Image src={photo.imageUrl} alt="" fill sizes="100vw" className="object-contain" />
      </div>
    </div>
  );
}
