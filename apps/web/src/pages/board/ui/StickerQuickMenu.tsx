import { Download, Edit, Reload, Trash } from '@ppotto/assets';
import { useRef, useState, type ComponentType, type Ref } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Modal } from '@/shared/ui/common/Modal';

import { useSaveStickerImage } from '../model/use-save-sticker-image';

import type { StickerData } from './Sticker';
import { StickerPreview } from './StickerPreview';

type StickerQuickMenuProps = {
  sticker: StickerData | undefined;
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  isEditingTitle: boolean;
  onSubmitTitle: (title: string) => void;
  onCancelEditTitle: () => void;
  titleInputRef: Ref<HTMLInputElement>;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onDelete: () => void;
  isDeleting: boolean;
};

type QuickMenuButtonProps = {
  Icon: ComponentType<{ color?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function QuickMenuButton({ Icon, label, onClick, disabled }: QuickMenuButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex items-center gap-2 text-white disabled:opacity-50"
      onClick={onClick}
    >
      <Icon color="white" />
      <span className="text-body-04 font-medium">{label}</span>
    </button>
  );
}

export function StickerQuickMenu({
  sticker,
  isOpen,
  onClose,
  onRename,
  isEditingTitle,
  onSubmitTitle,
  onCancelEditTitle,
  titleInputRef,
  onRegenerate,
  isRegenerating,
  onDelete,
  isDeleting,
}: StickerQuickMenuProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const previewImageRef = useRef<HTMLDivElement>(null);
  const { saveStickerImage, isSaving } = useSaveStickerImage();

  const handleSave = () => {
    if (previewImageRef.current) void saveStickerImage(previewImageRef.current, onClose);
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {/* BottomSheet 안에 렌더링해야 편집 중 클릭해도 시트가 안 닫힘 */}
        {sticker && (
          <StickerPreview
            sticker={sticker}
            titleInputRef={titleInputRef}
            imageRef={previewImageRef}
            isEditingTitle={isEditingTitle}
            onSubmitTitle={onSubmitTitle}
            onCancelEditTitle={onCancelEditTitle}
          />
        )}
        <QuickMenuButton Icon={Edit} label="이름 변경하기" onClick={onRename} />
        <QuickMenuButton
          Icon={Download}
          label={isSaving ? '스티커 저장하는 중...' : '스티커 저장하기'}
          onClick={handleSave}
          disabled={isSaving}
        />
        <QuickMenuButton
          Icon={Reload}
          label={isRegenerating ? '스티커 다시 만드는 중...' : '스티커 다시 만들기'}
          onClick={onRegenerate}
          disabled={isRegenerating}
        />
        <QuickMenuButton
          Icon={Trash}
          label="삭제하기"
          onClick={() => setIsDeleteConfirmOpen(true)}
          disabled={isDeleting}
        />
      </BottomSheet>
      <Modal
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={`${sticker?.title ?? ''} 스티커를 삭제하시겠습니까?`}
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
