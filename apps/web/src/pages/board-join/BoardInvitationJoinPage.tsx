'use client';

import { useFlow } from '@stackflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useJoinBoardInvitationMutation } from '@/entities/board/api/board-mutations';
import { clearPendingBoardInvitation } from '@/features/board-invitation';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/common/Button';
import { useToast } from '@/shared/ui/common/Toast';

import { getBoardJoinErrorMessage, isTerminalBoardJoinError } from './model/board-join-error';

export function BoardInvitationJoinPage({ code }: { code: string }) {
  const { pop, replace } = useFlow();
  const toast = useToast();
  const requestedCode = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const joinBoard = useJoinBoardInvitationMutation({
    onSuccess: ({ boardId, boardName }) => {
      void clearPendingBoardInvitation().then(() => {
        toast(`'${boardName}' 보드에 참여했어요`);
        replace('Board', { boardId }, { animate: false });
      });
    },
    onError: (error) => {
      toast(getBoardJoinErrorMessage(error));
      if (isTerminalBoardJoinError(error)) {
        void clearPendingBoardInvitation().then(() => pop({ animate: false }));
        return;
      }
      setFailed(true);
    },
  });

  const join = useCallback(() => {
    if (joinBoard.isPending) return;

    setFailed(false);
    joinBoard.mutate({ code });
  }, [code, joinBoard]);

  useEffect(() => {
    const normalizedCode = code.trim().toUpperCase();
    if (requestedCode.current === normalizedCode) return;
    requestedCode.current = normalizedCode;
    join();
  }, [code, join]);

  return (
    <main
      className={cn(
        'mx-auto flex h-dvh w-full max-w-107.5 flex-col',
        'items-center justify-center gap-4 bg-black px-6 text-body-04 text-gray-400',
      )}
    >
      <span>{failed ? '보드에 참여하지 못했어요' : '보드에 참여하는 중이에요'}</span>
      {failed && (
        <Button size="medium" onClick={join}>
          다시 시도
        </Button>
      )}
    </main>
  );
}
