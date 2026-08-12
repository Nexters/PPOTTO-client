import { Download, Filter, Instagram, Kakaotalk, X } from '@ppotto/assets';
import type { RefObject } from 'react';

import { saveRecapImage } from '@/features/save-recap-image';
import { bridge } from '@/shared/lib/bridge';
import { blobToBase64 } from '@/shared/lib/blob-to-base64';
import { useToast } from '@/shared/ui/common/Toast';

type RecapShareListProps = {
  cardRef: RefObject<HTMLDivElement | null>;
  onOptionsClick: () => void;
  onSaved: () => void;
};

export function RecapShareList({ cardRef, onOptionsClick, onSaved }: RecapShareListProps) {
  const toast = useToast();

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    try {
      const blob = await saveRecapImage(cardRef.current);
      const base64 = await blobToBase64(blob);
      const { success } = await bridge.request('SAVE_IMAGE', { base64 });
      if (success) {
        toast('이미지가 저장되었습니다');
        onSaved();
      } else {
        toast('이미지 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('이미지 저장 실패', error);
      toast('이미지 저장에 실패했습니다');
    }
  };

  const shareItems = [
    { label: '카카오톡', Icon: Kakaotalk, onClick: () => {} },
    { label: '인스타그램', Icon: Instagram, onClick: () => {} },
    { label: 'X', Icon: X, onClick: () => {} },
  ];

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <span className="text-body-01 text-white">공유하기</span>
        <button type="button" onClick={onOptionsClick}>
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
        <button
          type="button"
          className="flex items-center gap-2 text-white"
          onClick={handleSaveImage}
        >
          <Download />
          <span className="text-body-04 font-medium">이미지 저장하기</span>
        </button>
      </div>
    </>
  );
}
