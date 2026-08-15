'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { StickerComment } from '@/entities/sticker/api/sticker-api';
import { Bubble } from '@/shared/ui/Bubble';

import { getStickerShape, type OccupancyGrid } from '../model/get-sticker-content-bounds';
import { GRID_STEP, placeBubbles, type PlacedBubble } from '../model/recap-bubble-layout';

type RecapStickerVisualProps = {
  imageUrl: string;
  floatComments: StickerComment[];
  onLayoutComputed?: (placed: PlacedBubble[]) => void;
};

const STICKER_BOX = 176; // h-44 w-44
const CONTAINER_HEIGHT = 208; // h-52
const FALLBACK_STICKER_BOUNDS = { width: STICKER_BOX, height: STICKER_BOX };
const BUBBLE_GAP = 8; // recap-bubble-layout.ts의 GAP과 동일
const MIN_BUBBLE_MAX_WIDTH = 72; // 그 이하로는 텍스트가 거의 안 들어가 의미 없음

export function RecapStickerVisual({
  imageUrl,
  floatComments,
  onLayoutComputed,
}: RecapStickerVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [placed, setPlaced] = useState<PlacedBubble[]>([]);
  const [bubbleMaxWidth, setBubbleMaxWidth] = useState(STICKER_BOX);

  // deps에 넣으면 floatComments처럼 매 렌더 재실행되는 문제 방지용 최신 콜백 ref
  const onLayoutComputedRef = useRef(onLayoutComputed);
  useLayoutEffect(() => {
    onLayoutComputedRef.current = onLayoutComputed;
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    async function recalculate() {
      if (floatComments.length === 0) {
        setPlaced([]);
        return;
      }
      if (!container || container.offsetWidth === 0) return; // 아직 레이아웃 전 — 다음 resize에서 재계산

      let stickerBounds = FALLBACK_STICKER_BOUNDS;
      let stickerGrid: OccupancyGrid | null = null;
      try {
        const { bounds, grid } = await getStickerShape(imageUrl, STICKER_BOX, GRID_STEP);
        if (bounds) stickerBounds = { width: bounds.width, height: bounds.height };
        stickerGrid = grid;
      } catch (error) {
        console.warn('스티커 실제 영역 계산 실패, 기본 크기로 대체', error);
      }
      if (cancelled) return;

      // 스티커 옆 실제 여유 폭만큼만 버블 최대폭 허용 — 자리보다 큰 버블 자체를 방지
      const availableSideWidth = (container.offsetWidth - stickerBounds.width) / 2 - BUBBLE_GAP;
      const maxWidth = Math.max(MIN_BUBBLE_MAX_WIDTH, availableSideWidth);

      // maxWidth 반영 후 실측을 위해 상태 갱신을 동기 flush
      flushSync(() => setBubbleMaxWidth(maxWidth));

      const bubbleSizes = floatComments.map((comment, index) => {
        const el = bubbleRefs.current[index];
        return { id: comment.id, width: el?.offsetWidth ?? 0, height: el?.offsetHeight ?? 0 };
      });

      const result = placeBubbles(
        bubbleSizes,
        stickerBounds,
        { width: container.offsetWidth, height: CONTAINER_HEIGHT },
        stickerGrid,
      );
      setPlaced(result);
      onLayoutComputedRef.current?.(result);
    }

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [imageUrl, floatComments]);

  return (
    <div ref={containerRef} className="relative flex h-52 w-full items-center justify-center">
      <svg width="0" height="0" className="absolute">
        <filter id="sticker-outline">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="dilated" />
          <feFlood floodColor="white" result="color" />
          <feComposite in="color" in2="dilated" operator="in" result="outline" />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      <div className="relative h-44 w-44">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="176px"
          className="object-contain"
          style={{ filter: 'url(#sticker-outline)' }}
        />
      </div>
      {placed.map((bubble) => {
        const comment = floatComments.find((c) => c.id === bubble.id);
        if (!comment) return null;

        return (
          <div
            key={comment.id}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${bubble.posX}px, ${bubble.posY}px)`,
            }}
          >
            <Bubble
              content={comment.content}
              direction={bubble.posX < 0 ? 'right' : 'left'}
              maxWidth={bubbleMaxWidth}
            />
          </div>
        );
      })}
      {/* 각 버블 실제 크기 측정용 숨김 레이어 */}
      <div className="invisible absolute flex flex-col items-start gap-2" aria-hidden>
        {floatComments.map((comment, index) => (
          <div
            key={comment.id}
            ref={(el) => {
              bubbleRefs.current[index] = el;
            }}
          >
            <Bubble content={comment.content} direction="left" maxWidth={bubbleMaxWidth} />
          </div>
        ))}
      </div>
    </div>
  );
}
