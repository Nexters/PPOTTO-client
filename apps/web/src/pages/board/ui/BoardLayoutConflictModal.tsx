import { Modal } from '@/shared/ui/common/Modal';

type BoardLayoutConflictModalProps = {
  open: boolean;
  kind: 'changed' | 'deleted';
  onAll: () => void;
  onExclude: () => void;
  onBack: () => void;
  onSaveRest: () => void;
};

export function BoardLayoutConflictModal({
  open,
  kind,
  onAll,
  onExclude,
  onBack,
  onSaveRest,
}: BoardLayoutConflictModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={() => {}}
      title={
        kind === 'deleted' ? '편집하던 항목이 삭제됐어요' : '다른 참여자가 같은 항목을 수정했어요'
      }
      description={
        kind === 'deleted'
          ? '삭제된 항목은 저장할 수 없어요.'
          : '모두 적용하면 다른 참여자의 변경을 덮어씁니다.'
      }
    >
      <Modal.Cancel onClick={kind === 'deleted' ? onBack : onAll}>
        {kind === 'deleted' ? '돌아가기' : '모두 적용'}
      </Modal.Cancel>
      <Modal.Confirm onClick={kind === 'deleted' ? onSaveRest : onExclude}>
        나머지 저장
      </Modal.Confirm>
    </Modal>
  );
}
