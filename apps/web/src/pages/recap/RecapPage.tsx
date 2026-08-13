import { useFlow } from '@stackflow/react';
import { useEffect, useMemo } from 'react';

import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { cn } from '@/shared/lib/cn';
import { hexToRgba } from '@/shared/lib/hex-to-rgba';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';

import { useMarkStickerViewed } from '../board/model/use-mark-sticker-viewed';

import { RecapHeader } from './ui/RecapHeader';
import { RecapPhotoGrid } from './ui/RecapPhotoGrid';
import { RecapStickerVisual } from './ui/RecapStickerVisual';
import { RecapSummary } from './ui/RecapSummary';
import { RecapThemeTags } from './ui/RecapThemeTags';

type RecapPageProps = {
  stickerId: string;
  boardId: string;
};

export function RecapPage({ stickerId, boardId }: RecapPageProps) {
  const { data, refetch, isStale } = useStickerQuery(stickerId);
  const { markViewed } = useMarkStickerViewed(boardId);
  const { pop } = useFlow();

  useRefetchOnActive(refetch, isStale);

  useEffect(() => {
    if (data?.sticker.isNew) {
      markViewed(stickerId);
    }
  }, [data?.sticker.isNew, markViewed, stickerId]);

  const tagContents = useMemo(
    () =>
      (data?.comments.filter((comment) => comment.posX == null) ?? []).map((tag) => tag.content),
    [data?.comments],
  );

  if (!data) return null;

  const floatComments = data.comments.filter((comment) => comment.posX != null);

  return (
    <div
      className="flex min-h-full w-full flex-col gap-10 pb-5.5"
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
        <div className={cn('relative flex w-full flex-col gap-10 px-5', 'pt-16')}>
          <RecapHeader title={data.sticker.title} onBack={() => pop()} onShare={() => {}} />
          <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col">
              <RecapStickerVisual
                imageUrl={data.sticker.imageUrl ?? ''}
                floatComments={floatComments}
              />
              <RecapSummary content={data.summary} />
            </div>
            <RecapThemeTags tags={tagContents} />
          </div>
        </div>
      </div>
      <div className="px-5">
        <RecapPhotoGrid stickerId={stickerId} photos={data.photos} />
      </div>
    </div>
  );
}
