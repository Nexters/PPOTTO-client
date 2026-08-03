'use client';

import { useFlow } from '@stackflow/react';
import { useEffect, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';

import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { useBoardQuery } from '@/entities/board/api/board-queries';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';

import { computeInitialLayout, needsInitialLayout, toLayoutInput } from '../model/board-layout';

import { Sticker, type StickerData } from './Sticker';

const REFERENCE_WIDTH = 360;
const REFERENCE_HEIGHT = 740;

type BoardCanvasProps = {
  boardId: string;
};

export function BoardCanvas({ boardId }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(REFERENCE_WIDTH);
  const { data, isLoading, isError, refetch, isStale } = useBoardQuery(boardId);
  const { mutate: saveLayout } = useUpdateBoardLayoutMutation();
  const { push } = useFlow();

  useRefetchOnActive(refetch, isStale);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const unlaidOut = data ? needsInitialLayout(data.stickers) : false;
  const layout = data ? (unlaidOut ? computeInitialLayout(data.stickers) : data.stickers) : null;

  useEffect(() => {
    if (!layout || !unlaidOut) return;
    saveLayout({ boardId, input: toLayoutInput(layout) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, data]);

  const scale = width / REFERENCE_WIDTH;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오는 중이에요</p>
      </div>
    );
  }

  if (isError || !data || !layout) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오지 못했어요</p>
      </div>
    );
  }

  const stickers: StickerData[] = layout
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
            <Sticker
              key={sticker.id}
              sticker={sticker}
              onClick={() => push('Recap', { stickerId: sticker.id })}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
