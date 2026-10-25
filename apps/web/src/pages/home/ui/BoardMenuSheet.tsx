import { Edit, Trash } from '@ppotto/assets';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import { QuickMenuButton } from '../../board/ui/StickerQuickMenu';

type BoardMenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export function BoardMenuSheet({ isOpen, onClose, onRename, onDelete }: BoardMenuSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="보드 메뉴"
      overlayClassName="bg-transparent"
    >
      <span className="text-body-01 w-full text-white">보드 메뉴</span>
      <div className="flex w-full gap-2">
        <QuickMenuButton Icon={Edit} label="이름 변경하기" onClick={onRename} />
        <QuickMenuButton Icon={Trash} label="삭제하기" onClick={onDelete} />
      </div>
    </BottomSheet>
  );
}
