import { useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { StickerCommentPosition, StickerRecap } from '@/entities/sticker/api/sticker-api';
import { useUpdateStickerCommentPositionsMutation } from '@/entities/sticker/api/sticker-mutations';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';
import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { hexToRgba } from '@/shared/lib/hex-to-rgba';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';
import { useTrackActivityView } from '@/shared/lib/use-track-activity-view';
import { track } from '@/shared/lib/bridge';

import { useMarkStickerViewed } from '../board/model/use-mark-sticker-viewed';

import { RecapHeader } from './ui/RecapHeader';
import { RecapHeaderSkeleton } from './ui/RecapHeaderSkeleton';
import { RecapPhotoGrid } from './ui/RecapPhotoGrid';
import { RecapPhotoGridSkeleton } from './ui/RecapPhotoGridSkeleton';
import { RecapShareSheet } from './ui/RecapShareSheet';
import { RecapStickerVisual } from './ui/RecapStickerVisual';
import { RecapStickerVisualSkeleton } from './ui/RecapStickerVisualSkeleton';
import { RecapSummary } from './ui/RecapSummary';
import { RecapSummarySkeleton } from './ui/RecapSummarySkeleton';
import { RecapThemeTags } from './ui/RecapThemeTags';
import { RecapThemeTagsSkeleton } from './ui/RecapThemeTagsSkeleton';

type RecapPageProps = {
  stickerId: string;
  boardId: string;
};

export function RecapPage({ stickerId, boardId }: RecapPageProps) {
  const { data, refetch, isStale } = useStickerQuery(stickerId);
  const { markViewed } = useMarkStickerViewed(boardId);
  const { mutateAsync: updateCommentPositions } = useUpdateStickerCommentPositionsMutation();
  const queryClient = useQueryClient();
  const { pop } = useFlow();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const positionedStickerIdRef = useRef<string | null>(null);

  useRefetchOnActive(refetch, isStale);
  useTrackActivityView(Boolean(data), 'recap_viewed', { entry_point: 'board' });

  const handleInitialCommentLayout = useCallback(
    async (comments: StickerCommentPosition[]) => {
      if (positionedStickerIdRef.current === stickerId) return;
      positionedStickerIdRef.current = stickerId;

      try {
        await updateCommentPositions({ stickerId, comments });
        queryClient.setQueryData<StickerRecap>(stickerQueryKeys.detail(stickerId), (current) =>
          current
            ? {
                ...current,
                comments: current.comments.map((comment) => {
                  const position = comments.find(({ id }) => id === comment.id);
                  return position ? { ...comment, ...position } : comment;
                }),
              }
            : current,
        );
        markViewed(stickerId);
      } catch {
        positionedStickerIdRef.current = null;
      }
    },
    [markViewed, queryClient, stickerId, updateCommentPositions],
  );

  const tagContents = useMemo(
    () =>
      (data?.comments.filter((comment) => comment.posX == null) ?? []).map((tag) => tag.content),
    [data?.comments],
  );

  if (!data) {
    return (
      <div
        className="flex min-h-full w-full flex-col gap-10"
        style={{
          backgroundColor: '#000',
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          paddingBottom: 'var(--rn-safe-area-inset-bottom, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex w-full flex-col gap-10 px-5">
          <RecapHeaderSkeleton onBack={() => pop()} />
          <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col">
              <RecapStickerVisualSkeleton />
              <RecapSummarySkeleton />
            </div>
            <RecapThemeTagsSkeleton />
          </div>
        </div>
        <div className="px-5">
          <RecapPhotoGridSkeleton />
        </div>
      </div>
    );
  }

  const floatComments = data.comments.filter((comment) => comment.posX != null);

  return (
    <div
      className="flex min-h-full w-full flex-col gap-10"
      style={{
        backgroundColor: '#000',
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        paddingBottom: 'var(--rn-safe-area-inset-bottom, env(safe-area-inset-bottom))',
      }}
    >
      <div className="relative flex w-full flex-col">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, ${hexToRgba(data.sticker.mainColor, 0.5)} 0%, rgba(102, 102, 102, 0) 63.34%)`,
          }}
        />
        <div className="relative flex w-full flex-col gap-10 px-5">
          <RecapHeader
            title={data.sticker.title}
            onBack={() => pop()}
            onShare={() => {
              track('recap_share_opened');
              setIsShareOpen(true);
            }}
          />
          <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col">
              <RecapStickerVisual
                stickerId={stickerId}
                imageUrl={data.sticker.imageUrl ?? ''}
                floatComments={floatComments}
                isNew={data.sticker.isNew}
                onInitialLayout={handleInitialCommentLayout}
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
      <RecapShareSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        stickerId={stickerId}
        data={data}
      />
    </div>
  );
}
