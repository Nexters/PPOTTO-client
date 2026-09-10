'use client';

import { ImageMultiple } from '@ppotto/assets';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import type { ShareOptionKey } from '@/pages/recap/ui/RecapShareOptions';
import { RecapStickerVisual } from '@/pages/recap/ui/RecapStickerVisual';
import { RecapSummary } from '@/pages/recap/ui/RecapSummary';
import { RecapThemeTags } from '@/pages/recap/ui/RecapThemeTags';
import { cn } from '@/shared/lib/cn';
import { hexToRgba } from '@/shared/lib/hex-to-rgba';
import { track } from '@/shared/lib/bridge';

import { SharedPhotoViewer } from './SharedPhotoViewer';

type SharedRecapViewProps = {
  data: StickerRecap;
  options: Record<ShareOptionKey, boolean>;
};

export function SharedRecapView({ data, options }: SharedRecapViewProps) {
  const viewedSticker = useRef<string | null>(null);
  useEffect(() => {
    if (viewedSticker.current === data.sticker.id) return;
    viewedSticker.current = data.sticker.id;
    track('screen_view', { screen_name: 'recap' });
    track('recap_viewed', { entry_point: 'share' });
  }, [data.sticker.id]);
  const [openPhotoIndex, setOpenPhotoIndex] = useState<number | null>(null);
  const floatComments = data.comments.filter((comment) => comment.posX != null);
  const tagContents = data.comments
    .filter((comment) => comment.posX == null)
    .map((tag) => tag.content);

  return (
    <div
      className={cn('mx-auto flex min-h-full w-full max-w-112.5 flex-col gap-10', 'pb-10')}
      style={{
        backgroundColor: '#000',
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <div className="relative flex w-full flex-col">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, ${hexToRgba(data.sticker.mainColor, 0.5)} 0%, rgba(102, 102, 102, 0) 63.34%)`,
          }}
        />
        <div className="relative flex w-full flex-col gap-10 px-5 pt-10">
          <span className="text-body-01 text-center text-gray-50">{data.sticker.title}</span>
          <div className="flex w-full flex-col">
            {options.image && (
              <RecapStickerVisual
                stickerId={data.sticker.id}
                imageUrl={data.sticker.imageUrl ?? ''}
                floatComments={floatComments}
              />
            )}
            {options.summary && <RecapSummary content={data.summary} />}
          </div>
          {options.themeAnalysis && <RecapThemeTags tags={tagContents} />}
        </div>
      </div>
      {options.themePhotos && (
        <div className="recap-share-photo-grid grid grid-cols-3 gap-3 px-5">
          {data.photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              data-recap-photo-index={index}
              className="rounded-8 relative aspect-square w-full overflow-hidden"
              onClick={() => setOpenPhotoIndex(index)}
            >
              <Image src={photo.imageUrl} alt="" fill sizes="33vw" className="object-cover" />
              {photo.groupPhotos.length > 0 && (
                <ImageMultiple
                  width={20}
                  height={20}
                  viewBox="9 7 20 20"
                  color="#fff"
                  style={{
                    position: 'absolute',
                    top: 7,
                    right: 6,
                    filter: 'drop-shadow(0px 2.5px 10.83px rgba(0, 0, 0, 0.5))',
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
      {openPhotoIndex !== null && (
        <SharedPhotoViewer
          photos={data.photos}
          initialIndex={openPhotoIndex}
          onClose={() => setOpenPhotoIndex(null)}
        />
      )}
    </div>
  );
}
