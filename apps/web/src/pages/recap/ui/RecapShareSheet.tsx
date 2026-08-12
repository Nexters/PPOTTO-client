import { Download, Filter, Instagram, Kakaotalk, X } from '@ppotto/assets';

import { BottomSheet } from '@/shared/ui/BottomSheet';

type RecapShareSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function RecapShareSheet({ isOpen, onClose }: RecapShareSheetProps) {
  const shareItems = [
    { label: '카카오톡', Icon: Kakaotalk, onClick: () => {} },
    { label: '인스타그램', Icon: Instagram, onClick: () => {} },
    { label: 'X', Icon: X, onClick: () => {} },
    { label: '이미지 저장하기', Icon: Download, onClick: () => {} },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} overlayClassName="bg-black/50">
      <div className="flex w-full items-center justify-between">
        <span className="text-body-01 text-white">공유하기</span>
        <button type="button">
          <Filter />
        </button>
      </div>
      <div className="flex w-full flex-col gap-4">
        {shareItems.map(({ label, Icon, onClick }) => (
          <button
            key={label}
            type="button"
            className="flex items-center gap-2 text-white"
            onClick={onClick}
          >
            <Icon />
            <span className="text-body-04 font-medium">{label}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
