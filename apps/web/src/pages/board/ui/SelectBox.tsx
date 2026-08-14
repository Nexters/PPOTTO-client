'use client';

import type { StickerTransform } from '../model/board-transform';

import { getPhotoSize, stickerZIndex, useStickerImage, type StickerData } from './Sticker';

const BOX_COLOR = '#009fff';
const TICK_SIZE = 7;
const BORDER_WIDTH = 1.5;

const TICK_POSITIONS: { top?: number; bottom?: number; left?: number; right?: number }[] = [
  { top: -TICK_SIZE / 2, left: -TICK_SIZE / 2 },
  { top: -TICK_SIZE / 2, right: -TICK_SIZE / 2 },
  { bottom: -TICK_SIZE / 2, left: -TICK_SIZE / 2 },
  { bottom: -TICK_SIZE / 2, right: -TICK_SIZE / 2 },
];

type SelectBoxProps = {
  sticker: StickerData;
  transformOverride?: StickerTransform;
};

export function SelectBox({ sticker, transformOverride }: SelectBoxProps) {
  const photoImage = useStickerImage(sticker.imageUrl ?? undefined);
  const scale = transformOverride?.scale ?? sticker.scale;
  const { width, height } = getPhotoSize(photoImage, scale);

  if (width <= 0 || height <= 0) return null;

  const x = transformOverride?.x ?? sticker.posX ?? 0;
  const y = transformOverride?.y ?? sticker.posY ?? 0;
  const rotation = transformOverride?.rotation ?? sticker.rotation;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        border: `${BORDER_WIDTH}px solid ${BOX_COLOR}`,
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: stickerZIndex(sticker) + 2,
      }}
    >
      {TICK_POSITIONS.map((position, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            width: TICK_SIZE,
            height: TICK_SIZE,
            background: '#fff',
            border: `${BORDER_WIDTH}px solid ${BOX_COLOR}`,
            boxSizing: 'border-box',
            ...position,
          }}
        />
      ))}
    </div>
  );
}
