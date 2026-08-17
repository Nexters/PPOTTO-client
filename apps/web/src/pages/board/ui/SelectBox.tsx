'use client';

import { STICKER_OUTLINE_WIDTH, useStickerImageWithFallback } from '@/shared/lib/sticker-raster';

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
  const outline = STICKER_OUTLINE_WIDTH * scale;

  return (
    <SelectionBoxFrame
      x={x}
      y={y}
      width={width + outline * 2}
      height={height + outline * 2}
      rotation={rotation}
      zIndex={stickerZIndex(sticker) + 2}
    />
  );
}
