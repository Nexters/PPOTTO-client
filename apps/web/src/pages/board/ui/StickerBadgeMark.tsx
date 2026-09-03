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
  onOpenRecap: (stickerId: string) => void;
};

export const StickerBadgeMark = memo(function StickerBadgeMark({
  sticker,
  isEditMode,
  opacity,
  onOpenRecap,
}: StickerBadgeMarkProps) {
  const photoImage = useStickerImage(sticker.imageUrl ?? undefined);
  const { height } = getPhotoSize(photoImage, sticker.scale);

  if (height <= 0) return null;

  const offset = rotatePoint({ x: 0, y: height / 2 }, sticker.rotation);
  const isInteractive = !isEditMode && opacity > 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: (sticker.posX ?? 0) + offset.x,
        top: (sticker.posY ?? 0) + offset.y,
        zIndex: badgeZIndex(sticker),
        transform: 'translate(-50%, -50%) scale(var(--inv-camera-scale, 1))',
        opacity,
        pointerEvents: isInteractive ? 'auto' : 'none',
      }}
      onPointerDown={isInteractive ? (event) => event.stopPropagation() : undefined}
      onClick={isInteractive ? () => onOpenRecap(sticker.id) : undefined}
    >
      <StickerBadge title={sticker.title} isNew={sticker.isNew} />
    </div>
  );
});
