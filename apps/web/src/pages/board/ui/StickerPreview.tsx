'use client';

import type { Ref } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { drawOutlinedSticker, useStickerImage } from '@/shared/lib/sticker-raster';

import type { StickerData } from './Sticker';
import { StickerBadge } from './StickerBadge';

const HEADER_HEIGHT = 72;
const BOTTOM_RESERVE_HEIGHT = 320;
const PREVIEW_MAX_HEIGHT = 280;
const PREVIEW_MAX_WIDTH = 280;
const BADGE_HEIGHT = 30;
const CONTENT_GAP = 8;
const BREATHING_ROOM = 16;

type StickerPreviewProps = {
  sticker: StickerData;
  isEditingTitle?: boolean;
  onSubmitTitle?: (title: string) => void;
  onCancelEditTitle?: () => void;
  titleInputRef?: Ref<HTMLInputElement>;
  imageRef?: Ref<HTMLDivElement>;
};

export function StickerPreview({
  sticker,
  isEditingTitle,
  onSubmitTitle,
  onCancelEditTitle,
  titleInputRef,
  imageRef,
}: StickerPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const photoImage = useStickerImage(sticker.imageUrl ?? undefined, PREVIEW_MAX_WIDTH);

  useLayoutEffect(() => {
    if (canvasRef.current && photoImage) {
      drawOutlinedSticker(canvasRef.current, photoImage, PREVIEW_MAX_WIDTH);
    }
  }, [photoImage]);

  if (!sticker.imageUrl) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-55 flex flex-col items-center',
        'justify-center gap-2',
        isEditingTitle ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      style={{ top: HEADER_HEIGHT, bottom: BOTTOM_RESERVE_HEIGHT }}
    >
      <div
        ref={imageRef}
        className="relative"
        style={{
          width: PREVIEW_MAX_WIDTH,
          // 헤더, BOTTOM_RESERVE_HEIGHT 제외 남는 공간이 280px 미만일 때의 이미지 높이 축소
          height: `min(${PREVIEW_MAX_HEIGHT}px, calc(100dvh - ${HEADER_HEIGHT}px - ${BOTTOM_RESERVE_HEIGHT}px - ${BADGE_HEIGHT}px - ${CONTENT_GAP}px - ${BREATHING_ROOM}px))`,
        }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      <StickerBadge
        ref={titleInputRef}
        title={sticker.title}
        isNew={sticker.isNew}
        isEditing={isEditingTitle}
        onSubmit={onSubmitTitle}
        onCancel={onCancelEditTitle}
      />
    </div>
  );
}
