'use client';

import Image from 'next/image';
import type { Ref } from 'react';

import { cn } from '@/shared/lib/cn';

import type { StickerData } from './Sticker';
import { StickerBadge } from './StickerBadge';

const HEADER_HEIGHT = 72;
const QUICK_MENU_HEIGHT = 236;
const PREVIEW_MAX_HEIGHT = 280;
const PREVIEW_MAX_WIDTH = 280;

type StickerPreviewProps = {
  sticker: StickerData;
  isEditingTitle?: boolean;
  onSubmitTitle?: (title: string) => void;
  onCancelEditTitle?: () => void;
  titleInputRef?: Ref<HTMLInputElement>;
};

export function StickerPreview({
  sticker,
  isEditingTitle,
  onSubmitTitle,
  onCancelEditTitle,
  titleInputRef,
}: StickerPreviewProps) {
  if (!sticker.imageUrl) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-55 flex flex-col items-center',
        'justify-center gap-2',
      )}
      style={{ top: HEADER_HEIGHT, bottom: QUICK_MENU_HEIGHT }}
    >
      <div className="relative" style={{ width: PREVIEW_MAX_WIDTH, height: PREVIEW_MAX_HEIGHT }}>
        <Image
          src={sticker.imageUrl}
          alt=""
          fill
          sizes={`${PREVIEW_MAX_WIDTH}px`}
          style={{ objectFit: 'contain' }}
        />
      </div>
      <div className="pointer-events-auto">
        <StickerBadge
          ref={titleInputRef}
          title={sticker.title}
          isNew={sticker.isNew}
          isEditing={isEditingTitle}
          onSubmit={onSubmitTitle}
          onCancel={onCancelEditTitle}
        />
      </div>
    </div>
  );
}
