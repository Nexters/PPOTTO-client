import { useFlow } from '@stackflow/react';
import { useEffect } from 'react';

import { useMarkStickerViewedMutation } from '@/entities/sticker/api/sticker-mutations';
import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { cn } from '@/shared/lib/cn';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';

import { RecapHeader } from './ui/RecapHeader';
import { RecapPhotoGrid } from './ui/RecapPhotoGrid';
import { RecapStickerVisual } from './ui/RecapStickerVisual';
import { RecapSummary } from './ui/RecapSummary';
import { RecapThemeTags } from './ui/RecapThemeTags';

type RecapPageProps = {
  stickerId: string;
};

export function RecapPage({ stickerId }: RecapPageProps) {
  const { data, refetch, isStale } = useStickerQuery(stickerId);
  const { mutate: markViewed } = useMarkStickerViewedMutation();
  const { pop } = useFlow();

  useRefetchOnActive(refetch, isStale);

  useEffect(() => {
    if (data?.sticker.isNew) {
      markViewed(stickerId);
    }
  }, [data?.sticker.isNew, markViewed, stickerId]);

  if (!data) return null;

  const floatComments = data.comments.filter((comment) => comment.posX !== undefined);
  const tags = data.comments.filter((comment) => comment.posX === undefined);

  return (
    <div className={cn('flex min-h-full w-full flex-col gap-10 bg-black px-5', 'pt-16 pb-5.5')}>
      <RecapHeader title={data.sticker.title} onBack={() => pop()} onShare={() => {}} />
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col">
          <RecapStickerVisual
            imageUrl={data.sticker.imageUrl ?? ''}
            floatComments={floatComments}
          />
          <RecapSummary content={data.summary} />
        </div>
        <RecapThemeTags tags={tags.map((tag) => tag.content)} />
      </div>
      <RecapPhotoGrid stickerId={stickerId} photos={data.photos} />
    </div>
  );
}
