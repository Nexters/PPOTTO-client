'use client';

import { Layer, Stage } from 'react-konva';

import { mockStickers } from '../model/mock-stickers';

import { Sticker } from './Sticker';

export function BoardCanvas() {
  return (
    <Stage width={360} height={740}>
      <Layer>
        {mockStickers.map((sticker) => (
          <Sticker key={sticker.id} sticker={sticker} />
        ))}
      </Layer>
    </Stage>
  );
}
