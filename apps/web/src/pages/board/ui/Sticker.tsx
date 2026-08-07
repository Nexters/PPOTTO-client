'use client';

import type { paths } from '@ppotto/api';
import { useEffect, useState } from 'react';
import { Group, Image as KonvaImage, Text as KonvaText } from 'react-konva';
import { Html } from 'react-konva-utils';

import { useLongPress } from '@/shared/lib/use-long-press';

import { StickerBadge } from './StickerBadge';

const TEXT_BG_URL = '/board/stickers/text-bg.svg';
const TEXT_BOX_WIDTH = 129.13;
const TEXT_BOX_HEIGHT = 93.26;

type BoardDetail = NonNullable<
  paths['/boards/{boardId}']['get']['responses']['200']['content']['application/json']['data']
>;
type ApiSticker = BoardDetail['stickers'][number];

export type StickerImage = {
  url: string;
  /** 지정 안 하면 로드된 이미지의 원본 크기(자연 크기) × scale을 쓴다. 크롭 등으로 렌더 크기를 원본과 다르게 둬야 할 때만 명시한다. */
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  crop?: { x: number; y: number; width: number; height: number };
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
};

/**
 * badgeRotation은 명세에 있지만, 뱃지는 항상 스티커 회전의 반대로 고정돼야 한다는 디자인 결정에 따라
 * 무시하고 -rotation을 직접 계산해서 쓴다. imageUrl은 크기 정보가 없어 렌더링에 필요한 값을 담은
 * image로 대체한다.
 */
export type StickerData = Omit<ApiSticker, 'badgeRotation' | 'imageUrl'> & {
  image?: StickerImage;
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
  onClick?: () => void;
  onLongPress?: () => void;
};

export function Sticker({ sticker, onClick, onLongPress }: StickerProps) {
  const photoImage = useStickerImage(sticker.type === 'IMAGE' ? sticker.image?.url : undefined);
  const textBgImage = useStickerImage(sticker.type === 'TEXT' ? TEXT_BG_URL : undefined);
  const longPressHandlers = useLongPress(() => onLongPress?.());

  const photoWidth = (sticker.image?.width ?? photoImage?.naturalWidth ?? 0) * sticker.scale;
  const photoHeight = (sticker.image?.height ?? photoImage?.naturalHeight ?? 0) * sticker.scale;
  const textBoxWidth = TEXT_BOX_WIDTH * sticker.scale;
  const textBoxHeight = TEXT_BOX_HEIGHT * sticker.scale;

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
      {...longPressHandlers}
    >
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
            text={sticker.textContent ?? ''}
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
