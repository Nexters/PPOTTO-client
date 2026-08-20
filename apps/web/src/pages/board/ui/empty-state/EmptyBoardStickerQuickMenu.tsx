import { Download, Edit, Trash } from '@ppotto/assets';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import { QuickMenuButton } from '../StickerQuickMenu';

type EmptyBoardStickerQuickMenuProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

export function EmptyBoardStickerQuickMenu({
  title,
  isOpen,
  onClose,
  onRename,
  onDelete,
}: EmptyBoardStickerQuickMenuProps) {
  const menuItems = [
    {
      label: '이름 변경하기',
      Icon: Edit,
      onClick: () => {
        // 제목은 1자 이상 15자 이하 — 빈 입력은 무시하고 초과분은 잘라낸다
        const nextTitle = window.prompt('스티커 이름을 입력해주세요.', title)?.trim().slice(0, 15);
        if (nextTitle) onRename(nextTitle);
        onClose();
      },
    },
    { label: '스티커 저장', Icon: Download, onClick: onClose },
    {
      label: '삭제하기',
      Icon: Trash,
      onClick: () => {
        onDelete();
        onClose();
      },
    },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <span className="text-body-01 w-full text-white">스티커 메뉴</span>
      <div className="flex w-full items-start justify-between">
        {menuItems.map(({ label, Icon, onClick }) => (
          <QuickMenuButton key={label} Icon={Icon} label={label} onClick={onClick} />
        ))}
        <div className="w-18" aria-hidden />
      </div>
    </BottomSheet>
  );
}
