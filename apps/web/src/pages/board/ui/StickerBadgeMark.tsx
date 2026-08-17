'use client';

import { memo } from 'react';

import { useStickerImageWithFallback } from '@/shared/lib/sticker-raster';

import { rotatePoint } from '../model/geometry';

import { StickerBadge } from './StickerBadge';
import { badgeZIndex, getPhotoSize, stickerDisplayedEdge, type StickerData } from './Sticker';

type StickerBadgeMarkProps = {
  sticker: StickerData;
  onNameClick: (stickerId: string) => void;
};

export const StickerBadgeMark = memo(function StickerBadgeMark({
  sticker,
  onNameClick,
}: StickerBadgeMarkProps) {
  const photoImage = useStickerImageWithFallback(
    sticker.imageUrl ?? undefined,
    stickerDisplayedEdge(sticker.scale),
  );
  const { height } = getPhotoSize(photoImage, sticker.scale);

  if (height <= 0) return null;

  const offset = rotatePoint({ x: 0, y: height / 2 }, sticker.rotation);

  return (
    <div
      style={{
        position: 'absolute',
        left: (sticker.posX ?? 0) + offset.x,
        top: (sticker.posY ?? 0) + offset.y,
        zIndex: badgeZIndex(sticker),
        transform: 'translate(-50%, -50%) scale(var(--inv-camera-scale, 1))',
        pointerEvents: 'auto',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => onNameClick(sticker.id)}
    >
      <StickerBadge title={sticker.title} isNew={sticker.isNew} />
    </div>
  );
});
