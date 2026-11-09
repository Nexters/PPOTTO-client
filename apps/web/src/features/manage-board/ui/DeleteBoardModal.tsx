'use client';

import { Modal } from '@/shared/ui/common/Modal';

import type { DeleteBoardTarget } from '../model/use-delete-board';

type DeleteBoardModalProps = {
  target: DeleteBoardTarget | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteBoardModal({
  target,
  isPending,
  onConfirm,
  onCancel,
}: DeleteBoardModalProps) {
  // participantCount는 방장 포함 인원이다
  const othersCount = (target?.participantCount ?? 1) - 1;

  return (
    <Modal
      open={target !== null}
      onOpenChange={(open) => !open && onCancel()}
      title={`‘${target?.name ?? ''}’ 보드를 삭제할까요?`}
      description={
        othersCount > 0 ? (
          <>
            함께하는 {othersCount}명이 올린 스티커와 리캡도
            <br />
            모두 삭제되며 복구할 수 없어요
          </>
        ) : (
          <>
            보드의 스티커와 리캡, 그림이 모두 삭제되며
            <br />
            복구할 수 없어요.
          </>
        )
      }
    >
      <Modal.Cancel disabled={isPending}>취소</Modal.Cancel>
      <Modal.Confirm onClick={onConfirm} disabled={isPending}>
        삭제
      </Modal.Confirm>
    </Modal>
  );
}
