import { useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { useUpdateCommentPositionsMutation } from '@/entities/sticker/api/sticker-mutations';
import { useStickerQuery } from '@/entities/sticker/api/sticker-queries';
import { stickerQueryKeys } from '@/entities/sticker/api/sticker-query-keys';
import { hexToRgba } from '@/shared/lib/hex-to-rgba';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';

import { useMarkStickerViewed } from '../board/model/use-mark-sticker-viewed';

import type { PlacedBubble } from './model/recap-bubble-layout';
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
  const queryClient = useQueryClient();
  const { mutate: saveCommentPositions } = useUpdateCommentPositionsMutation();

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
  const floatComments = useMemo(
    () => data?.comments.filter((comment) => comment.posX != null) ?? [],
    [data?.comments],
  );

  // 불필요한 API 호출 방지 — 저장된 값과 다를 때만 저장
  const handleLayoutComputed = (placed: PlacedBubble[]) => {
    const changed = placed.some((bubble) => {
      const original = floatComments.find((comment) => comment.id === bubble.id);
      return !original || original.posX !== bubble.posX || original.posY !== bubble.posY;
    });
    if (!changed) return;

    saveCommentPositions(
      { stickerId, comments: placed },
      {
        onSuccess: () => {
          queryClient.setQueryData(
            stickerQueryKeys.detail(stickerId),
            (current: StickerRecap | undefined) =>
              current
                ? {
                    ...current,
                    comments: current.comments.map((comment) => {
                      const match = placed.find((bubble) => bubble.id === comment.id);
                      return match ? { ...comment, posX: match.posX, posY: match.posY } : comment;
                    }),
                  }
                : current,
          );
        },
      },
    );
  };

  if (!data) return null;

  return (
    <div
      className="flex min-h-full w-full flex-col gap-10"
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
        <div className="relative flex w-full flex-col gap-10 px-5">
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
                onLayoutComputed={handleLayoutComputed}
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
