import Image from 'next/image';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { hexToRgba } from '@/shared/lib/hex-to-rgba';
import type { ShareOptionKey } from '@/pages/recap/ui/RecapShareOptions';
import { RecapStickerVisual } from '@/pages/recap/ui/RecapStickerVisual';
import { RecapSummary } from '@/pages/recap/ui/RecapSummary';
import { RecapThemeTags } from '@/pages/recap/ui/RecapThemeTags';

type SharedRecapViewProps = {
  data: StickerRecap;
  options: Record<ShareOptionKey, boolean>;
};

export function SharedRecapView({ data, options }: SharedRecapViewProps) {
  const floatComments = data.comments.filter((comment) => comment.posX != null);
  const tagContents = data.comments
    .filter((comment) => comment.posX == null)
    .map((tag) => tag.content);

  return (
    <div
      className="flex min-h-full w-full flex-col gap-10 pb-10"
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
        <div className="grid grid-cols-3 gap-3 px-5">
          {data.photos.map((photo) => (
            <div key={photo.id} className="rounded-8 relative aspect-square w-full overflow-hidden">
              <Image src={photo.imageUrl} alt="" fill sizes="33vw" className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
