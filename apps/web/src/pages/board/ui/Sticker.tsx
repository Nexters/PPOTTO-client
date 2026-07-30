'use client';

import { useEffect, useState } from 'react';
import { Group, Image as KonvaImage, Text as KonvaText } from 'react-konva';
import { Html } from 'react-konva-utils';

import { StickerBadge } from './StickerBadge';

const TEXT_BG_URL = '/board/stickers/text-bg.svg';

export type StickerImage = {
  url: string;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  crop?: { x: number; y: number; width: number; height: number };
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
};

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
  image?: StickerImage;
  textContent?: string;
  textBoxWidth?: number;
  textBoxHeight?: number;
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
  const photoImage = useStickerImage(sticker.type === 'IMAGE' ? sticker.image?.url : undefined);
  const textBgImage = useStickerImage(sticker.type === 'TEXT' ? TEXT_BG_URL : undefined);

  const photoWidth = (sticker.image?.width ?? 0) * sticker.scale;
  const photoHeight = (sticker.image?.height ?? 0) * sticker.scale;
  const textBoxWidth = (sticker.textBoxWidth ?? 0) * sticker.scale;
  const textBoxHeight = (sticker.textBoxHeight ?? 0) * sticker.scale;

  return (
    <Group x={sticker.posX} y={sticker.posY} rotation={sticker.rotation}>
      {sticker.type === 'IMAGE' && photoImage && sticker.image && (
        <Group
          x={sticker.image.offsetX ?? 0}
          y={sticker.image.offsetY ?? 0}
          rotation={sticker.image.rotation ?? 0}
        >
          <KonvaImage
            image={photoImage}
            x={-photoWidth / 2}
            y={-photoHeight / 2}
            width={photoWidth}
            height={photoHeight}
            crop={sticker.image.crop}
            cornerRadius={sticker.image.cornerRadius}
            stroke={sticker.image.borderColor}
            strokeWidth={sticker.image.borderWidth}
          />
        </Group>
      )}
      {sticker.type === 'TEXT' && textBgImage && (
        <>
          <KonvaImage
            image={textBgImage}
            x={-textBoxWidth / 2}
            y={-textBoxHeight / 2}
            width={textBoxWidth}
            height={textBoxHeight}
          />
          <KonvaText
            text={sticker.textContent}
            x={-textBoxWidth / 2 + 14}
            y={-textBoxHeight / 2 + 14}
            width={textBoxWidth - 28}
            height={textBoxHeight - 28}
            fontFamily="Pretendard"
            fontSize={10.76}
            lineHeight={1.5}
            fill="white"
            wrap="word"
            ellipsis
          />
        </>
      )}
      <Html groupProps={{ x: sticker.badgeOffsetX, y: sticker.badgeOffsetY }}>
        <div style={{ transform: `translate(-50%, -50%) rotate(${-sticker.rotation}deg)` }}>
          <StickerBadge title={sticker.title} isNew={sticker.isNew} />
        </div>
      </Html>
    </Group>
  );
}
