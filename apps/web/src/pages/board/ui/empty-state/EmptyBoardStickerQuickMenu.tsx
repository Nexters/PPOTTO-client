import { Download, Edit, Trash } from '@ppotto/assets';

import { BottomSheet } from '@/shared/ui/BottomSheet';

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
    { label: '스티커 저장하기', Icon: Download, onClick: onClose },
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
      {menuItems.map(({ label, Icon, onClick }) => (
        <button
          key={label}
          type="button"
          className="flex items-center w-full gap-2 text-white"
          onClick={onClick}
        >
          <Icon color="white" />
          <span className="font-medium text-body-04">{label}</span>
        </button>
      ))}
    </BottomSheet>
  );
}
