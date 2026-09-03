'use client';

import { memo } from 'react';

import { useStickerImage } from '@/shared/lib/sticker-raster';

import { rotatePoint } from '../model/geometry';

import { StickerBadge } from './StickerBadge';
import { badgeZIndex, getPhotoSize, type StickerData } from './Sticker';

type StickerBadgeMarkProps = {
  sticker: StickerData;
  isEditMode: boolean;
  opacity: number;
};

export const StickerBadgeMark = memo(function StickerBadgeMark({
  sticker,
  isEditMode,
  opacity,
}: StickerBadgeMarkProps) {
  const photoImage = useStickerImage(sticker.imageUrl ?? undefined);
  const { height } = getPhotoSize(photoImage, sticker.scale);

  if (height <= 0) return null;

  const offset = rotatePoint({ x: 0, y: height / 2 }, sticker.rotation);
  const isInteractive = !isEditMode && opacity > 0;

  return (
    <div
      data-sticker-id={sticker.id}
      style={{
        position: 'absolute',
        left: (sticker.posX ?? 0) + offset.x,
        top: (sticker.posY ?? 0) + offset.y,
        zIndex: badgeZIndex(sticker),
        transform: 'translate(-50%, -50%) scale(var(--inv-camera-scale, 1))',
        opacity,
        pointerEvents: isInteractive ? 'auto' : 'none',
      }}
    >
      <div className="sticker-long-press-visual">
        <StickerBadge title={sticker.title} isNew={sticker.isNew} />
      </div>
    </div>
  );
});
