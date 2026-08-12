import { useFlow } from '@stackflow/react';
import { useEffect, useState } from 'react';

import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { cn } from '@/shared/lib/cn';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';

import { useMarkStickerViewed } from '../board/model/use-mark-sticker-viewed';

import { RecapHeader } from './ui/RecapHeader';
import { RecapPhotoGrid } from './ui/RecapPhotoGrid';
import { RecapShareSheet } from './ui/RecapShareSheet';
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
  const [isShareOpen, setIsShareOpen] = useState(false);

  useRefetchOnActive(refetch, isStale);

  useEffect(() => {
    if (data?.sticker.isNew) {
      markViewed(stickerId);
    }
  }, [data?.sticker.isNew, markViewed, stickerId]);

  if (!data) return null;

  const floatComments = data.comments.filter((comment) => comment.posX != null);
  const tags = data.comments.filter((comment) => comment.posX == null);

  return (
    <div
      className={cn('flex min-h-full w-full flex-col gap-10 px-5', 'pt-16 pb-5.5')}
      style={{
        backgroundColor: '#000',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <RecapHeader
        title={data.sticker.title}
        onBack={() => pop()}
        onShare={() => setIsShareOpen(true)}
      />
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
      <RecapShareSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        stickerId={stickerId}
        data={data}
      />
    </div>
  );
}
