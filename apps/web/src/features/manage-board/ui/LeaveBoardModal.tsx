'use client';

import { Modal } from '@/shared/ui/common/Modal';

import type { LeaveBoardTarget } from '../model/use-leave-board';

type LeaveBoardModalProps = {
  open: boolean;
  target: LeaveBoardTarget | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LeaveBoardModal({
  open,
  target,
  isPending,
  onConfirm,
  onCancel,
}: LeaveBoardModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(open) => !open && onCancel()}
      title={`'${target?.name ?? ''}' 보드에서 나갈까요?`}
      description={
        <>
          내가 올린 스티커와 리캡이 삭제되며
          <br />
          복구할 수 없어요
        </>
      }
      layerClassName="z-80"
    >
      <Modal.Cancel disabled={isPending}>취소</Modal.Cancel>
      <Modal.Confirm onClick={onConfirm} disabled={isPending}>
        나가기
      </Modal.Confirm>
    </Modal>
  );
}
