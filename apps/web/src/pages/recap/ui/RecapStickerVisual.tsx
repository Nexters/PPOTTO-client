import { useLayoutEffect, useRef } from 'react';

import type { StickerComment } from '@/entities/sticker/api/sticker-api';
import {
  drawOutlinedSticker,
  STICKER_OUTLINE_WIDTH,
  useStickerImage,
} from '@/shared/lib/sticker-raster';
import { Bubble } from '@/shared/ui/Bubble';

const STICKER_MAX_EDGE = 176;

type RecapStickerVisualProps = {
  imageUrl: string;
  floatComments: StickerComment[];
};

export function RecapStickerVisual({ imageUrl, floatComments }: RecapStickerVisualProps) {
  const image = useStickerImage(imageUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const longestEdge = Math.max(image?.naturalWidth ?? 0, image?.naturalHeight ?? 0);
  const ratio = longestEdge > 0 ? STICKER_MAX_EDGE / longestEdge : 0;
  const width = (image?.naturalWidth ?? 0) * ratio;
  const height = (image?.naturalHeight ?? 0) * ratio;

  useLayoutEffect(() => {
    if (canvasRef.current && image) {
      drawOutlinedSticker(canvasRef.current, image, STICKER_MAX_EDGE);
    }
  }, [image]);

  return (
    <div className="relative flex h-52 w-full items-center justify-center">
      <div className="flex h-44 w-44 items-center justify-center">
        {image && (
          <canvas
            ref={canvasRef}
            aria-hidden
            style={{
              width: width + STICKER_OUTLINE_WIDTH * 2,
              height: height + STICKER_OUTLINE_WIDTH * 2,
            }}
          />
        )}
      </div>
      {floatComments.map((comment) => (
        <div
          key={comment.id}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${comment.posX ?? 0}px, ${comment.posY ?? 0}px)`,
          }}
        >
          <Bubble
            content={comment.content}
            direction={(comment.posX ?? 0) < 0 ? 'right' : 'left'}
          />
        </div>
      ))}
    </div>
  );
}
