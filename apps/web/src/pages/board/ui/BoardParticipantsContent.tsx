import { IconPlus, ParticipantProfile } from '@ppotto/assets';

import type { BoardParticipants } from '@/entities/board/api/board-api';
import { cn } from '@/shared/lib/cn';
import { shouldShowLoadError } from '@/shared/lib/should-show-load-error';
import { Button } from '@/shared/ui/common/Button';

export type BoardParticipantListState = {
  data?: BoardParticipants;
  currentUserId?: string;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
};

type BoardParticipantsContentProps = BoardParticipantListState & {
  onInvite: () => void;
  isInvitePending?: boolean;
};

type ParticipantItemProps = {
  name: string;
  isMe: boolean;
};

const PARTICIPANT_SKELETON_COUNT = 4;

function BoardParticipantsSkeleton() {
  return (
    <div role="status" aria-label="참여자 목록 불러오는 중" className="w-full animate-pulse">
      <div className="mb-5 h-6 w-24 rounded bg-gray-800" />
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-5">
        {Array.from({ length: PARTICIPANT_SKELETON_COUNT }, (_, index) => (
          <div key={index} aria-hidden className="flex w-18 flex-col items-center gap-2">
            <span className="size-12 rounded-full bg-gray-800" />
            <span className="h-4 w-12 rounded bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ParticipantItem({ name, isMe }: ParticipantItemProps) {
  const label = `${name}${isMe ? '(나)' : ''}`;

  return (
    <div className="flex w-18 flex-col items-center gap-2">
      <ParticipantProfile width={48} height={48} />
      <span className="text-caption-01 w-full truncate text-center font-medium text-white">
        {label}
      </span>
    </div>
  );
}

export function BoardParticipantsContent({
  data,
  currentUserId,
  isPending,
  isError,
  onRetry,
  onInvite,
  isInvitePending,
}: BoardParticipantsContentProps) {
  if (isPending) return <BoardParticipantsSkeleton />;

  if (shouldShowLoadError(isError, data)) {
    return (
      <div
        className={cn('flex min-h-30 w-full flex-col items-center', 'justify-center gap-3 py-6')}
      >
        <p className="text-body-04 text-gray-400">참여자 목록을 불러오지 못했어요</p>
        <Button size="medium" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const canInvite = data.participantCount < data.maxParticipantCount;

  return (
    <>
      <h2 className="text-body-01 w-full text-white">참여자 {data.participantCount}명</h2>
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-5">
        {data.participants.map((participant) => (
          <ParticipantItem
            key={participant.userId}
            name={participant.name}
            isMe={participant.userId === currentUserId}
          />
        ))}
        {canInvite && (
          <button
            type="button"
            onClick={onInvite}
            disabled={isInvitePending}
            className="flex w-18 flex-col items-center gap-2 disabled:opacity-50"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
              <IconPlus color="white" width={24} height={24} />
            </span>
            <span className="text-caption-01 w-full text-center font-medium text-white">
              초대하기
            </span>
          </button>
        )}
      </div>
    </>
  );
}
