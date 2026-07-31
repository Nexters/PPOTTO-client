'use client';

import { useEffect, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';

import { useBoardQuery } from '@/entities/board/api/board-queries';

import { Sticker, type StickerData } from './Sticker';

const REFERENCE_WIDTH = 360;
const REFERENCE_HEIGHT = 740;

type BoardCanvasProps = {
  boardId: string;
};

export function BoardCanvas({ boardId }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(REFERENCE_WIDTH);
  const { data, isLoading, isError } = useBoardQuery(boardId);

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

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오는 중이에요</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오지 못했어요</p>
      </div>
    );
  }

  const stickers: StickerData[] = data.stickers
    .map(({ imageUrl, ...sticker }) => ({
      ...sticker,
      image: imageUrl ? { url: imageUrl } : undefined,
    }))
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <Stage width={width} height={REFERENCE_HEIGHT * scale} scaleX={scale} scaleY={scale}>
        <Layer>
          {stickers.map((sticker) => (
            <Sticker key={sticker.id} sticker={sticker} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
