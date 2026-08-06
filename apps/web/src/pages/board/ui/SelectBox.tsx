'use client';

import { Group, Rect } from 'react-konva';

import { getPhotoSize, useStickerImage, type StickerData } from './Sticker';

const SELECT_BOX_COLOR = '#009fff';
const SELECT_BOX_HANDLE_SIZE = 4;

type SelectBoxProps = {
  sticker: StickerData;
};

export function SelectBox({ sticker }: SelectBoxProps) {
  const photoImage = useStickerImage(sticker.imageUrl ?? undefined);
  const { width: boxWidth, height: boxHeight } = getPhotoSize(photoImage, sticker.scale);

  if (boxWidth <= 0 || boxHeight <= 0) return null;

  return (
    <Group x={sticker.posX} y={sticker.posY} rotation={sticker.rotation}>
      <Rect
        x={-boxWidth / 2}
        y={-boxHeight / 2}
        width={boxWidth}
        height={boxHeight}
        stroke={SELECT_BOX_COLOR}
        strokeWidth={0.5}
        listening={false}
      />
      {[
        [-boxWidth / 2, -boxHeight / 2],
        [boxWidth / 2, -boxHeight / 2],
        [-boxWidth / 2, boxHeight / 2],
        [boxWidth / 2, boxHeight / 2],
      ].map(([handleX, handleY]) => (
        <Rect
          key={`${handleX}-${handleY}`}
          x={handleX! - SELECT_BOX_HANDLE_SIZE / 2}
          y={handleY! - SELECT_BOX_HANDLE_SIZE / 2}
          width={SELECT_BOX_HANDLE_SIZE}
          height={SELECT_BOX_HANDLE_SIZE}
          fill="white"
          stroke={SELECT_BOX_COLOR}
          strokeWidth={0.5}
          listening={false}
        />
      ))}
    </Group>
  );
}
