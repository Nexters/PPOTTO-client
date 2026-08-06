'use client';

import type { paths } from '@ppotto/api';
import { useEffect, useState } from 'react';
import { Group, Image as KonvaImage } from 'react-konva';
import { Html } from 'react-konva-utils';

import { StickerBadge } from './StickerBadge';

// 스티커 크기는 긴 변을 이 값으로 맞추고 비율을 유지한다
const STICKER_MAX_EDGE = 160;

type BoardDetail = NonNullable<
  paths['/boards/{boardId}']['get']['responses']['200']['content']['application/json']['data']
>;
type ApiSticker = BoardDetail['stickers'][number];

/**
 * badgeRotation은 명세에 있지만, 뱃지는 항상 스티커 회전의 반대로 고정돼야 한다는 디자인 결정에 따라
 * 무시하고 -rotation을 직접 계산해서 쓴다.
 */
export type StickerData = Omit<ApiSticker, 'badgeRotation'>;

export function useStickerImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.onload = () => setImage(img);
  }, [src]);

  return image;
}

export function getPhotoSize(
  photoImage: HTMLImageElement | null,
  scale: number,
): { width: number; height: number } {
  const naturalWidth = photoImage?.naturalWidth ?? 0;
  const naturalHeight = photoImage?.naturalHeight ?? 0;
  const longestEdge = Math.max(naturalWidth, naturalHeight);
  const normalizeRatio = longestEdge > 0 ? STICKER_MAX_EDGE / longestEdge : 1;

  return {
    width: naturalWidth * normalizeRatio * scale,
    height: naturalHeight * normalizeRatio * scale,
  };
}

type StickerProps = {
  sticker: StickerData;
  onClick?: () => void;
};

export function Sticker({ sticker, onClick }: StickerProps) {
  const photoImage = useStickerImage(sticker.imageUrl ?? undefined);
  const { width: photoWidth, height: photoHeight } = getPhotoSize(photoImage, sticker.scale);

  return (
    <Group
      x={sticker.posX}
      y={sticker.posY}
      rotation={sticker.rotation}
      onClick={onClick}
      onTap={onClick}
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage && onClick) stage.container().style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
      }}
    >
      {photoImage && (
        <KonvaImage
          image={photoImage}
          x={-photoWidth / 2}
          y={-photoHeight / 2}
          width={photoWidth}
          height={photoHeight}
        />
      )}
      <Html groupProps={{ x: sticker.badgeOffsetX, y: sticker.badgeOffsetY }}>
        <div style={{ transform: `translate(-50%, -50%) rotate(${-sticker.rotation}deg)` }}>
          <StickerBadge title={sticker.title} isNew={sticker.isNew} />
        </div>
      </Html>
    </Group>
  );
}
