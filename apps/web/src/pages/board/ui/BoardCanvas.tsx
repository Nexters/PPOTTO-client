'use client';

import { useFlow } from '@stackflow/react';
import { useEffect, useState } from 'react';
import { Layer, Stage } from 'react-konva';

import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { useBoardQuery } from '@/entities/board/api/board-queries';

import { computeInitialLayout, needsInitialLayout, toLayoutInput } from '../model/board-layout';

import { Sticker, type StickerData } from './Sticker';

type BoardCanvasProps = {
  boardId: string;
};

export function BoardCanvas({ boardId }: BoardCanvasProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const { data, isLoading, isError } = useBoardQuery(boardId);
  const { mutate: saveLayout } = useUpdateBoardLayoutMutation();
  const { push } = useFlow();

  useEffect(() => {
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  const unlaidOut = data ? needsInitialLayout(data.stickers) : false;
  const layout = data ? (unlaidOut ? computeInitialLayout(data.stickers) : data.stickers) : null;

  useEffect(() => {
    if (!layout || !unlaidOut) return;
    saveLayout({ boardId, input: toLayoutInput(layout) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, data]);

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
    <div ref={setContainer} className="h-full w-full touch-none">
      <Stage draggable width={viewport.width} height={viewport.height}>
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
