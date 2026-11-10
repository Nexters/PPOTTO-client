'use client';

import { useState } from 'react';

import { useLeaveBoardMutation } from '@/entities/board/api/board-mutations';
import { useToast } from '@/shared/ui/common/Toast';

import { getBoardErrorMessage } from './board-error-message';

export type LeaveBoardTarget = {
  id: string;
  name: string;
};

export function useLeaveBoard({ onLeft }: { onLeft?: () => void } = {}) {
  const toast = useToast();
  const [target, setTarget] = useState<LeaveBoardTarget | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { mutate, isPending } = useLeaveBoardMutation({
    onSuccess: () => {
      if (!target) return;
      setIsOpen(false);
      toast(`'${target.name}' 보드에서 나갔어요`);
      onLeft?.();
    },
    onError: (error) => {
      setIsOpen(false);
      toast(getBoardErrorMessage(error, '보드에서 나가지 못했어요. 다시 시도해 주세요'));
    },
  });

  const request = (board: LeaveBoardTarget) => {
    setTarget(board);
    setIsOpen(true);
  };

  const confirm = () => {
    if (!target || !isOpen || isPending) return;

    mutate(target.id);
  };

  const cancel = () => {
    if (!isPending) setIsOpen(false);
  };

  return { target, isOpen, request, confirm, cancel, isPending };
}
