import { Download, Edit, Trash } from '@ppotto/assets';

import { BottomSheet } from '@/shared/ui/BottomSheet';

type EmptyBoardStickerQuickMenuProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onRename: (title: string) => void;
};

export function EmptyBoardStickerQuickMenu({
  title,
  isOpen,
  onClose,
  onRename,
}: EmptyBoardStickerQuickMenuProps) {
  const menuItems = [
    {
      label: '이름 변경하기',
      Icon: Edit,
      onClick: () => {
        const nextTitle = window.prompt('스티커 이름을 입력해주세요.', title)?.trim();
        if (nextTitle) onRename(nextTitle);
        onClose();
      },
    },
    { label: '스티커 저장하기', Icon: Download, onClick: onClose },
    { label: '삭제하기', Icon: Trash, onClick: onClose },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {menuItems.map(({ label, Icon, onClick }) => (
        <button
          key={label}
          type="button"
          className="flex w-full items-center gap-2 text-white"
          onClick={onClick}
        >
          <Icon color="white" />
          <span className="text-body-04 font-medium">{label}</span>
        </button>
      ))}
    </BottomSheet>
  );
}
