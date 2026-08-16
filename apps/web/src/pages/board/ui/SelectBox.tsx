'use client';

import { useStickerImageWithFallback } from '@/shared/lib/sticker-raster';

import type { StickerTransform } from '../model/board-transform';

import { getPhotoSize, stickerDisplayedEdge, stickerZIndex, type StickerData } from './Sticker';
import { SelectionBoxFrame } from './SelectionBoxFrame';

type SelectBoxProps = {
  sticker: StickerData;
  transformOverride?: StickerTransform;
};

export function SelectBox({ sticker, transformOverride }: SelectBoxProps) {
  const scale = transformOverride?.scale ?? sticker.scale;
  const photoImage = useStickerImageWithFallback(
    sticker.imageUrl ?? undefined,
    stickerDisplayedEdge(scale),
  );
  const { width, height } = getPhotoSize(photoImage, scale);

  if (width <= 0 || height <= 0) return null;

  const x = transformOverride?.x ?? sticker.posX ?? 0;
  const y = transformOverride?.y ?? sticker.posY ?? 0;
  const rotation = transformOverride?.rotation ?? sticker.rotation;

  return (
    <SelectionBoxFrame
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotation}
      zIndex={stickerZIndex(sticker) + 2}
    />
  );
}
