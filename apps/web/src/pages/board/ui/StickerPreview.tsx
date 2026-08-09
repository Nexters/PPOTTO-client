'use client';

import Image from 'next/image';

import { cn } from '@/shared/lib/cn';

import type { StickerData } from './Sticker';
import { StickerBadge } from './StickerBadge';

const HEADER_HEIGHT = 160;
const QUICK_MENU_HEIGHT = 236;
const PREVIEW_MAX_HEIGHT = 280;
const PREVIEW_MAX_WIDTH = 280;

type StickerPreviewProps = {
  sticker: StickerData;
};

export function StickerPreview({ sticker }: StickerPreviewProps) {
  if (!sticker.image?.url) return null;

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
          src={sticker.image.url}
          alt=""
          fill
          sizes={`${PREVIEW_MAX_WIDTH}px`}
          style={{ objectFit: 'contain' }}
        />
      </div>
      <StickerBadge title={sticker.title} isNew={sticker.isNew} />
    </div>
  );
}
