'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import type { StickerComment, StickerCommentPosition } from '@/entities/sticker/api/sticker-api';
import {
  drawOutlinedSticker,
  STICKER_OUTLINE_WIDTH,
  useStickerImage,
} from '@/shared/lib/sticker-raster';
import { Bubble } from '@/shared/ui/Bubble';
import { Skeleton } from '@/shared/ui/Skeleton';

const STICKER_MAX_EDGE = 176;
const COMMENT_LAYOUT_WIDTH = 352;
const COMMENT_LAYOUT_HEIGHT = 208;
const COMMENT_EDGE_GAP = 8;
const COMMENT_STICKER_GAP = 4;

type BubbleSize = { width: number; height: number };
type PositionedComment = StickerComment & StickerCommentPosition;

const hashText = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash, 31) + value.charCodeAt(index);
  }
  return hash >>> 0;
};

export function layoutRecapComments(
  stickerId: string,
  comments: StickerComment[],
  stickerSize: BubbleSize,
  bubbleSizes: Map<string, BubbleSize>,
): PositionedComment[] {
  const seed = hashText(stickerId);
  const ordered = [...comments].sort((a, b) => {
    const difference = hashText(`${stickerId}:${a.id}`) - hashText(`${stickerId}:${b.id}`);
    return difference || a.id.localeCompare(b.id);
  });
  const leftCount =
    comments.length === 2
      ? 1
      : comments.length === 4
        ? 2
        : comments.length === 3
          ? 1 + (seed % 2)
          : 0;
  const sides = ordered.map((_, index) => (index < leftCount ? -1 : 1));
  const spread = Math.min(52, Math.max(38, stickerSize.height * 0.35));
  const pairOffset = seed % 2 === 0 ? -8 : 8;
  const ySlots = (side: number) => {
    const count = sides.filter((value) => value === side).length;
    if (count === 1 && comments.length === 2) return [side * pairOffset * 3];
    if (count === 1) return [((seed >>> (side < 0 ? 3 : 7)) % 33) - 16];
    return [
      -spread + (side < 0 ? pairOffset : -pairOffset),
      spread + (side < 0 ? pairOffset : -pairOffset),
    ];
  };
  const slots = { '-1': ySlots(-1), '1': ySlots(1) };
  const used = { '-1': 0, '1': 0 };

  return ordered.map((comment, index) => {
    const side = sides[index] ?? 1;
    const sideKey = String(side) as '-1' | '1';
    const size = bubbleSizes.get(comment.id) ?? { width: 80, height: 32 };
    const idealX = stickerSize.width / 2 + COMMENT_STICKER_GAP + size.width / 2;
    const maxX = COMMENT_LAYOUT_WIDTH / 2 - COMMENT_EDGE_GAP - size.width / 2;
    const maxY = COMMENT_LAYOUT_HEIGHT / 2 - COMMENT_EDGE_GAP - size.height / 2;
    const targetY = slots[sideKey][used[sideKey]++] ?? 0;

    return {
      ...comment,
      posX: side * Math.min(idealX, Math.max(0, maxX)),
      posY: Math.max(-maxY, Math.min(maxY, targetY)),
    };
  });
}

type RecapStickerVisualProps = {
  stickerId: string;
  imageUrl: string;
  floatComments: StickerComment[];
  isNew?: boolean;
  onInitialLayout?: (comments: StickerCommentPosition[]) => void;
};

export function RecapStickerVisual({
  stickerId,
  imageUrl,
  floatComments,
  isNew = false,
  onInitialLayout,
}: RecapStickerVisualProps) {
  const image = useStickerImage(imageUrl, STICKER_MAX_EDGE);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRefs = useRef(new Map<string, HTMLDivElement>());
  const [initialLayout, setInitialLayout] = useState<{
    stickerId: string;
    comments: PositionedComment[];
  }>();
  const longestEdge = Math.max(image?.naturalWidth ?? 0, image?.naturalHeight ?? 0);
  const ratio = longestEdge > 0 ? STICKER_MAX_EDGE / longestEdge : 0;
  const width = (image?.naturalWidth ?? 0) * ratio;
  const height = (image?.naturalHeight ?? 0) * ratio;

  useLayoutEffect(() => {
    if (canvasRef.current && image) {
      drawOutlinedSticker(canvasRef.current, image, STICKER_MAX_EDGE);
    }
  }, [image]);

  useLayoutEffect(() => {
    if (!isNew || !image || initialLayout?.stickerId === stickerId) return;

    const comments = layoutRecapComments(
      stickerId,
      floatComments,
      {
        width: width + STICKER_OUTLINE_WIDTH * 2,
        height: height + STICKER_OUTLINE_WIDTH * 2,
      },
      new Map(
        [...bubbleRefs.current].map(([id, element]) => {
          const rect = element.getBoundingClientRect();
          return [id, { width: rect.width, height: rect.height }];
        }),
      ),
    );

    setInitialLayout({ stickerId, comments });
    onInitialLayout?.(comments.map(({ id, posX, posY }) => ({ id, posX, posY })));
  }, [
    floatComments,
    height,
    image,
    initialLayout?.stickerId,
    isNew,
    onInitialLayout,
    stickerId,
    width,
  ]);

  const positionedComments =
    isNew && initialLayout?.stickerId === stickerId ? initialLayout.comments : floatComments;
  const isPreparingLayout = isNew && initialLayout?.stickerId !== stickerId;

  return (
    <div className="relative flex h-52 w-full items-center justify-center">
      {/* 보드에서 이미 로드한 스티커면 세션 캐시가 즉시 물려서 스켈레톤 없이 그려진다 */}
      {!image && <Skeleton className="absolute h-44 w-44 rounded-24" />}
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
      {image &&
        positionedComments.map((comment) => (
          <div
            key={comment.id}
            ref={(element) => {
              if (element) bubbleRefs.current.set(comment.id, element);
              else bubbleRefs.current.delete(comment.id);
            }}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${comment.posX ?? 0}px, ${comment.posY ?? 0}px)`,
              visibility: isPreparingLayout ? 'hidden' : 'visible',
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
