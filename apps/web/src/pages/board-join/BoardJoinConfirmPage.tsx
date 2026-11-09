'use client';

import { HttpError } from '@ppotto/api';
import { AlertCircle, ChevronLeft, Logo } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import type { ReactNode } from 'react';

import type { BoardInvitationDetail } from '@/entities/board/api/board-api';
import { useJoinBoardInvitationMutation } from '@/entities/board/api/board-mutations';
import { useBoardInvitationQuery } from '@/entities/board/api/board-queries';
import { BoardInvitationPreview } from '@/entities/board/ui/BoardInvitationPreview';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/common/Button';
import { useToast } from '@/shared/ui/common/Toast';

export function BoardJoinConfirmPage({ code }: { code: string }) {
  const { pop, push } = useFlow();
  const toast = useToast();
  const { data, isPending, isError, refetch } = useBoardInvitationQuery(code);
  const joinBoard = useJoinBoardInvitationMutation();

  if (isPending) return <InvitationStatus>초대 정보를 불러오는 중이에요</InvitationStatus>;

  if (isError || !data) {
    return (
      <InvitationStatus>
        <span>초대 정보를 불러오지 못했어요</span>
        <Button size="medium" onClick={() => void refetch()}>
          다시 시도
        </Button>
      </InvitationStatus>
    );
  }

  const join = () => {
    if (joinBoard.isPending) return;

    joinBoard.mutate(
      { code },
      {
        onSuccess: ({ boardId }) => {
          pop(2, { animate: false });
          push('Board', { boardId });
        },
        onError: (error) => toast(getJoinErrorMessage(error)),
      },
    );
  };

  return (
    <InvitationConfirm
      invitation={data}
      isJoining={joinBoard.isPending}
      onBack={() => pop()}
      onJoin={join}
    />
  );
}

function InvitationConfirm({
  invitation,
  isJoining,
  onBack,
  onJoin,
}: {
  invitation: BoardInvitationDetail;
  isJoining: boolean;
  onBack: () => void;
  onJoin: () => void;
}) {
  const isAlreadyJoined =
    invitation.viewerStatus === 'OWNER' || invitation.viewerStatus === 'MEMBER';
  const isFull = !isAlreadyJoined && invitation.participantCount >= invitation.maxParticipantCount;
  const joinButtonLabel = isFull
    ? '참여 인원이 모두 찼어요'
    : isAlreadyJoined
      ? '보드 들어가기'
      : '참여하기';
  const participantNames = (invitation.participants ?? []).map(
    ({ name, role }) => `${name}님${role === 'OWNER' ? '(방장)' : ''}`,
  );
  const participantRows = balanceParticipantRows(participantNames);

  return (
    <main
      className={cn(
        'relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden',
        'bg-black px-6 text-white',
      )}
    >
      <header
        className="grid min-h-18 shrink-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center"
        style={{
          paddingTop: 'calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 0.75rem)',
        }}
      >
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={onBack}
          className="flex size-10 items-center justify-start"
        >
          <ChevronLeft />
        </button>
        <span className="justify-self-center">
          <Logo width={104.23} height={32} />
        </span>
        <span aria-hidden />
      </header>

      <section className="pt-8">
        <h1 className="text-body-01 whitespace-nowrap">
          {invitation.inviterName}님이 &apos;{invitation.boardName}&apos; 보드에 초대했어요
        </h1>
        <p className="mt-1 text-body-06 text-gray-400">
          참여자 {invitation.participantCount}명 · 스티커 {invitation.stickerCount}개
        </p>

        <div className="mt-7">
          <BoardInvitationPreview
            boardName={invitation.boardName}
            previewImageUrl={invitation.previewImageUrl}
            priority
          />
        </div>

        <div
          aria-label="참여자"
          className={cn(
            'mt-2 flex flex-col items-center justify-center gap-1 py-3',
            'text-body-06 text-gray-400',
          )}
        >
          {participantRows.map((row) => (
            <p key={row.join()} className="w-full truncate text-center">
              {row.join(', ')}
            </p>
          ))}
        </div>

        <div className={cn('mt-2.25 flex h-16 items-center gap-2 rounded-lg', 'bg-gray-900 p-2')}>
          <AlertCircle aria-hidden width={16} height={16} />
          <p className="text-[10px] leading-4 font-normal tracking-[-0.03em] text-gray-500">
            올린 사진과 리캡은 보드 참여자 모두가 볼 수 있어요.
            <br />
            방장이 보드를 링크로 공유하면 내 스티커도 함께 보여요.
            <br />
            보드에서 나가거나, 방장이 보드를 삭제하면 내 스티커는 사라져요.
          </p>
        </div>
      </section>

      <footer className="absolute inset-x-0 bottom-0 px-6 pb-12">
        <Button disabled={isFull || isJoining} onClick={onJoin}>
          {joinButtonLabel}
        </Button>
      </footer>
    </main>
  );
}

function getJoinErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 404) return '유효하지 않거나 만료된 초대예요';
    if (error.status === 409) return '참여 인원이 모두 찼어요';
  }
  return '보드에 참여하지 못했어요';
}

function balanceParticipantRows(names: string[]) {
  if (names.length <= 4) return names.length > 0 ? [names] : [];

  const firstRowCount = Math.ceil(names.length / 2);
  return [names.slice(0, firstRowCount), names.slice(firstRowCount)];
}

function InvitationStatus({ children }: { children: ReactNode }) {
  return (
    <main
      className={cn(
        'mx-auto flex h-dvh w-full max-w-107.5 flex-col',
        'items-center justify-center gap-4',
        'bg-black px-6 text-body-04 text-gray-400',
      )}
    >
      {children}
    </main>
  );
}
