'use client';

import { Layer, Rect, Stage } from 'react-konva';

export function BoardCanvas() {
  return (
    <Stage width={400} height={400}>
      <Layer>
        <Rect x={50} y={50} width={100} height={100} fill="#FFD400" />
      </Layer>
    </Stage>
  );
}
