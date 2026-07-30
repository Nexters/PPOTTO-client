'use client';

import { useEffect, useState } from 'react';
import { Group, Image as KonvaImage } from 'react-konva';
import { Html } from 'react-konva-utils';

import { StickerBadge } from './StickerBadge';

export type StickerData = {
  id: string;
  type: 'IMAGE' | 'TEXT';
  title: string;
  isNew: boolean;
  posX: number;
  posY: number;
  rotation: number;
  scale: number;
  badgeOffsetX: number;
  badgeOffsetY: number;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  textContent?: string;
};

function useStickerImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.onload = () => setImage(img);
  }, [src]);

  return image;
}

type StickerProps = {
  sticker: StickerData;
};

export function Sticker({ sticker }: StickerProps) {
  const image = useStickerImage(sticker.type === 'IMAGE' ? sticker.imageUrl : undefined);
  const width = (sticker.imageWidth ?? 0) * sticker.scale;
  const height = (sticker.imageHeight ?? 0) * sticker.scale;

  return (
    <Group x={sticker.posX} y={sticker.posY} rotation={sticker.rotation}>
      {sticker.type === 'IMAGE' && image && (
        <KonvaImage image={image} x={-width / 2} y={-height / 2} width={width} height={height} />
      )}
      <Html groupProps={{ x: sticker.badgeOffsetX, y: sticker.badgeOffsetY }}>
        <div style={{ transform: `translate(-50%, -50%) rotate(${-sticker.rotation}deg)` }}>
          <StickerBadge title={sticker.title} isNew={sticker.isNew} />
        </div>
      </Html>
    </Group>
  );
}
