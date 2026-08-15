import { useMemo } from 'react';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { hexToRgba } from '@/shared/lib/hex-to-rgba';

import type { ShareOptionKey } from './RecapShareOptions';
import { RecapPhotoGrid } from './RecapPhotoGrid';
import { RecapStickerVisual } from './RecapStickerVisual';
import { RecapSummary } from './RecapSummary';
import { RecapThemeTags } from './RecapThemeTags';

type RecapShareCardProps = {
  stickerId: string;
  data: StickerRecap;
  options: Record<ShareOptionKey, boolean>;
};

export function RecapShareCard({ stickerId, data, options }: RecapShareCardProps) {
  const floatComments = useMemo(
    () => data.comments.filter((comment) => comment.posX != null),
    [data.comments],
  );
  const tags = data.comments.filter((comment) => comment.posX == null);

  return (
    <div
      className="flex w-90 flex-col gap-10 pb-10"
      style={{
        backgroundColor: '#000',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <div
        className="flex flex-col gap-10 px-5 pt-10"
        style={{
          backgroundImage: `linear-gradient(180deg, ${hexToRgba(data.sticker.mainColor, 0.5)} 0%, rgba(102, 102, 102, 0) 63.34%)`,
        }}
      >
        <span className="text-body-01 text-center text-gray-50">{data.sticker.title}</span>
        {options.image && (
          <RecapStickerVisual
            imageUrl={data.sticker.imageUrl ?? ''}
            floatComments={floatComments}
          />
        )}
        {options.summary && <RecapSummary content={data.summary} />}
        {options.themeAnalysis && <RecapThemeTags tags={tags.map((tag) => tag.content)} />}
      </div>
      {options.themePhotos && (
        <div className="px-5">
          <RecapPhotoGrid stickerId={stickerId} photos={data.photos} eager />
        </div>
      )}
    </div>
  );
}
