import { Download, Edit, Reload, Trash } from '@ppotto/assets';

import { BottomSheet } from '@/shared/ui/BottomSheet';

type StickerQuickMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MENU_ITEMS = [
  { label: '이름 변경하기', Icon: Edit },
  { label: '스티커 저장하기', Icon: Download },
  { label: '스티커 다시 만들기', Icon: Reload },
  { label: '삭제하기', Icon: Trash },
];

export function StickerQuickMenu({ isOpen, onClose }: StickerQuickMenuProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {MENU_ITEMS.map(({ label, Icon }) => (
        <button
          key={label}
          type="button"
          className="flex items-center gap-2 text-white"
          onClick={onClose}
        >
          <Icon color="white" />
          <span className="text-body-04 font-medium">{label}</span>
        </button>
      ))}
    </BottomSheet>
  );
}
