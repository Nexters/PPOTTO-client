import { Download, Edit, Reload, Trash } from '@ppotto/assets';

import { BottomSheet } from '@/shared/ui/BottomSheet';

type StickerQuickMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
};

export function StickerQuickMenu({
  isOpen,
  onClose,
  onRegenerate,
  isRegenerating,
}: StickerQuickMenuProps) {
  const menuItems = [
    { label: '이름 변경하기', Icon: Edit, onClick: onClose, disabled: false },
    { label: '스티커 저장하기', Icon: Download, onClick: onClose, disabled: false },
    {
      label: isRegenerating ? '스티커 다시 만드는 중...' : '스티커 다시 만들기',
      Icon: Reload,
      onClick: onRegenerate,
      disabled: isRegenerating,
    },
    { label: '삭제하기', Icon: Trash, onClick: onClose, disabled: false },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
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
  );
}
