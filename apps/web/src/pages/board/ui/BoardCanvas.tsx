'use client';

import { useEffect, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';

import { mockStickers } from '../model/mock-stickers';

import { Sticker } from './Sticker';

const REFERENCE_WIDTH = 360;
const REFERENCE_HEIGHT = 740;

export function BoardCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(REFERENCE_WIDTH);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const scale = width / REFERENCE_WIDTH;
  const stickersByZIndex = [...mockStickers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <Stage width={width} height={REFERENCE_HEIGHT * scale} scaleX={scale} scaleY={scale}>
        <Layer>
          {stickersByZIndex.map((sticker) => (
            <Sticker key={sticker.id} sticker={sticker} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
