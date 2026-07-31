'use client';

import { Layer, Stage } from 'react-konva';

import { mockStickers } from '../model/mock-stickers';

import { Sticker } from './Sticker';

export function BoardCanvas() {
  const stickersByZIndex = [...mockStickers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Stage width={360} height={740}>
      <Layer>
        {stickersByZIndex.map((sticker) => (
          <Sticker key={sticker.id} sticker={sticker} />
        ))}
      </Layer>
    </Stage>
  );
}
