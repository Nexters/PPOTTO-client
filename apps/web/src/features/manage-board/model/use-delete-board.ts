'use client';

import { useState } from 'react';

import type { BoardSummary } from '@/entities/board/api/board-api';
import { useDeleteBoardMutation } from '@/entities/board/api/board-mutations';
import { useToast } from '@/shared/ui/common/Toast';

import { BOARD_ANALYZING_MESSAGE, getBoardErrorMessage } from './board-error-message';

export type DeleteBoardTarget = Pick<
  BoardSummary,
  'id' | 'name' | 'participantCount' | 'analysisStatus'
>;

export function useDeleteBoard({ onDeleted }: { onDeleted?: () => void } = {}) {
  const toast = useToast();
  const { mutate, isPending } = useDeleteBoardMutation();
  const [target, setTarget] = useState<DeleteBoardTarget | null>(null);

  // 서버도 409로 거절하지만, 이미 아는 상태면 확인 모달 없이 바로 안내한다
  const request = (board: DeleteBoardTarget) => {
    if (board.analysisStatus) {
      toast(BOARD_ANALYZING_MESSAGE);
      return;
    }
    setTarget(board);
  };

  const confirm = () => {
    if (!target || isPending) return;
    mutate(target.id, {
      onSuccess: () => {
        setTarget(null);
        toast('보드를 삭제했어요');
        onDeleted?.();
      },
      onError: (error) => {
        setTarget(null);
        toast(getBoardErrorMessage(error, '보드를 삭제하지 못했어요. 다시 시도해 주세요'));
      },
    });
  };

  const cancel = () => {
    if (!isPending) setTarget(null);
  };

  return { target, request, confirm, cancel, isPending };
}
