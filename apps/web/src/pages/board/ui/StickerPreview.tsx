'use client';

import type { Ref } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { drawOutlinedSticker, useCachedStickerImage } from '@/shared/lib/sticker-raster';
import { useVisualViewportInset } from '@/shared/lib/use-visual-viewport-inset';

import type { StickerData } from './Sticker';
import { StickerBadge } from './StickerBadge';

const HEADER_HEIGHT = 72;
const DEFAULT_BOTTOM_RESERVE_HEIGHT = 320;
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
  onTitleChange?: (title: string) => void;
  followKeyboard?: boolean;
  titleInputRef?: Ref<HTMLInputElement>;
  imageRef?: Ref<HTMLDivElement>;
  bottomReserveHeight?: number;
};

export function StickerPreview({
  sticker,
  isEditingTitle,
  onSubmitTitle,
  onCancelEditTitle,
  onTitleChange,
  followKeyboard,
  titleInputRef,
  imageRef,
  bottomReserveHeight = DEFAULT_BOTTOM_RESERVE_HEIGHT,
}: StickerPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyboardInset = useVisualViewportInset();

  const photoImage = useCachedStickerImage(sticker.imageUrl ?? undefined, PREVIEW_MAX_WIDTH);

  useLayoutEffect(() => {
    if (canvasRef.current && photoImage) {
      drawOutlinedSticker(canvasRef.current, photoImage, PREVIEW_MAX_WIDTH);
    }
  }, [photoImage]);

  if (!sticker.imageUrl) return null;

  // 키보드 실측 전(0) 순간 하강 방지용 기본값
  const bottom =
    isEditingTitle || followKeyboard
      ? Math.max(keyboardInset, bottomReserveHeight)
      : bottomReserveHeight;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-55 flex flex-col items-center',
        'justify-center gap-2 transition-[bottom] duration-300 ease-out',
      )}
      style={{ top: HEADER_HEIGHT, bottom }}
    >
      <div
        ref={imageRef}
        className="relative"
        style={{
          width: PREVIEW_MAX_WIDTH,
          // 헤더, bottom 제외 남는 공간이 280px 미만일 때의 이미지 높이 축소
          height: `min(${PREVIEW_MAX_HEIGHT}px, calc(100dvh - ${HEADER_HEIGHT}px - ${bottom}px - ${BADGE_HEIGHT}px - ${CONTENT_GAP}px - ${BREATHING_ROOM}px))`,
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
        onValueChange={onTitleChange}
      />
    </div>
  );
}
