import { Download, Edit, Reload, Trash } from '@ppotto/assets';
import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Modal } from '@/shared/ui/common/Modal';

type StickerQuickMenuProps = {
  stickerTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onDelete: () => void;
  isDeleting: boolean;
};

export function StickerQuickMenu({
  stickerTitle,
  isOpen,
  onClose,
  onRename,
  onRegenerate,
  isRegenerating,
  onDelete,
  isDeleting,
}: StickerQuickMenuProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const menuItems = [
    { label: '이름 변경하기', Icon: Edit, onClick: onRename, disabled: false },
    { label: '스티커 저장하기', Icon: Download, onClick: onClose, disabled: false },
    {
      label: isRegenerating ? '스티커 다시 만드는 중...' : '스티커 다시 만들기',
      Icon: Reload,
      onClick: onRegenerate,
      disabled: isRegenerating,
    },
    {
      label: '삭제하기',
      Icon: Trash,
      onClick: () => setIsDeleteConfirmOpen(true),
      disabled: isDeleting,
    },
  ];

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} modal={false}>
        {menuItems.map(({ label, Icon, onClick, disabled }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            className="flex items-center gap-2 text-white disabled:opacity-50"
            onClick={onClick}
          >
            <Icon color="white" />
            <span className="text-body-04 font-medium">{label}</span>
          </button>
        ))}
      </BottomSheet>
      <Modal
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={`${stickerTitle} 스티커를 삭제하시겠습니까?`}
        description="삭제한 스티커는 복구할 수 없습니다."
      >
        <Modal.Cancel>취소</Modal.Cancel>
        <Modal.Confirm
          onClick={() => {
            onDelete();
            setIsDeleteConfirmOpen(false);
          }}
        >
          확인
        </Modal.Confirm>
      </Modal>
    </>
  );
}
