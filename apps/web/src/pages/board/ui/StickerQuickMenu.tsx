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
  Icon: ComponentType<{ color?: string; width?: number; height?: number }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function QuickMenuButton({ Icon, label, onClick, disabled }: QuickMenuButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex w-18 flex-col items-center gap-2 disabled:opacity-50"
      onClick={onClick}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
        <Icon color="white" width={28} height={28} />
      </span>
      <span className="text-caption-01 w-full text-center font-medium text-white">{label}</span>
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
            bottomReserveHeight={198}
          />
        )}
        <span className="text-body-01 w-full text-white">스티커 메뉴</span>
        <div className="flex w-full items-start justify-between">
          <QuickMenuButton Icon={Edit} label="이름 변경하기" onClick={onRename} />
          <QuickMenuButton
            Icon={Download}
            label={isSaving ? '저장하는 중...' : '스티커 저장'}
            onClick={handleSave}
            disabled={isSaving}
          />
          <QuickMenuButton
            Icon={Reload}
            label={isRegenerating ? '재생성 중...' : '스티커 재생성'}
            onClick={onRegenerate}
            disabled={isRegenerating}
          />
          <QuickMenuButton
            Icon={Trash}
            label="삭제하기"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={isDeleting}
          />
        </div>
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
