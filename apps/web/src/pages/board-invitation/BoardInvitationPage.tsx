'use client';

import { Logo, Overlap } from '@ppotto/assets';

import type { BoardInvitationDetail } from '@/entities/board/api/board-api';
import { BoardInvitationPreview } from '@/entities/board/ui/BoardInvitationPreview';
import { cn } from '@/shared/lib/cn';
import { copyTextToClipboard } from '@/shared/lib/copy-text-to-clipboard';
import { Button } from '@/shared/ui/common/Button';
import { useToast } from '@/shared/ui/common/Toast';

type BoardInvitationPageProps = {
  invitation: BoardInvitationDetail;
};

export function BoardInvitationPage({ invitation }: BoardInvitationPageProps) {
  const toast = useToast();
  const isFull = invitation.participantCount >= invitation.maxParticipantCount;

  const copyInvitationCode = async () => {
    try {
      await copyTextToClipboard(invitation.code);
      toast('초대 코드를 복사했어요');
    } catch {
      toast('초대 코드를 복사하지 못했어요');
    }
  };

  return (
    <main className="mx-auto h-dvh w-full max-w-107.5 overflow-hidden bg-black text-white">
      <div className="flex h-full flex-col">
        <header
          className={cn(
            'mx-auto flex w-full max-w-90 flex-col gap-8',
            'px-6 pt-16',
            'bg-[linear-gradient(359.96deg,rgba(0,0,0,0)_0.03%,#000_54.13%)]',
          )}
        >
          <Logo width={104.23} height={32} />

          <div className="flex h-12 w-full flex-col gap-1">
            <h1 className="text-body-01 whitespace-nowrap text-white">
              {invitation.inviterName}님이 &apos;{invitation.boardName}&apos; 보드에 초대했어요
            </h1>
            <p className="text-body-06 text-gray-500">
              참여자 {invitation.participantCount}명 · 스티커 {invitation.stickerCount}개
            </p>
          </div>
        </header>

        <section className={cn('mx-auto mt-5 flex w-full max-w-90 flex-1 flex-col', 'px-6 pb-8')}>
          <BoardInvitationPreview
            boardName={invitation.boardName}
            previewImageUrl={invitation.previewImageUrl}
            priority
          />

          <div className="mt-[35.48px] flex flex-col items-center gap-3.5">
            <button
              type="button"
              aria-label="초대 코드 복사"
              onClick={() => void copyInvitationCode()}
              className="flex h-9.75 w-fit items-center gap-2 py-2"
            >
              <p
                className={cn(
                  'text-header-02 h-5.75 whitespace-nowrap font-sans leading-5.75 not-italic',
                  'tracking-[0.2em] text-white',
                )}
              >
                {invitation.code}
              </p>
              <span className="flex size-5 shrink-0 items-center justify-center">
                <Overlap aria-hidden width={20} height={20} color="#929292" />
              </span>
            </button>
            <p className="text-caption-01 text-center text-gray-500">
              앱이 없다면 설치한 뒤 이 링크를 다시 눌러주세요
              <br />
              코드로도 참여할 수 있어요
            </p>
          </div>

          <div className="mt-auto -mx-1.5 pt-8">
            <Button disabled={isFull} aria-disabled="true" className="pointer-events-none">
              {isFull ? '참여 인원이 모두 찼어요' : '앱에서 참여하기'}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
