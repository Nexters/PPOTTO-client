import { Download, Filter, Instagram, Kakaotalk } from '@ppotto/assets';
import { useState, type RefObject } from 'react';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isSharingInstagram, setIsSharingInstagram] = useState(false);

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstagramShare = async () => {
    if (!cardRef.current) return;
    setIsSharingInstagram(true);
    try {
      const blob = await saveRecapImage(cardRef.current);
      const base64 = await blobToBase64(blob);
      const { success } = await bridge.request('SHARE_INSTAGRAM_STORY', { base64 });
      if (success) onSaved();
      else toast('인스타그램 공유에 실패했습니다');
    } catch (error) {
      console.error('인스타그램 공유 실패', error);
      toast('인스타그램 공유에 실패했습니다');
    } finally {
      setIsSharingInstagram(false);
    }
  };

  return (
    <>
      <span className="text-body-01 text-white">공유하기</span>
      <div className="flex w-full items-start justify-between">
        <button type="button" className="flex w-[72px] flex-col items-center gap-2 text-white">
          <Kakaotalk width={48} height={48} />
          <span className="text-caption-01 w-full text-center">카카오톡</span>
        </button>
        <button
          type="button"
          disabled={isSharingInstagram}
          className="flex w-[72px] flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={handleInstagramShare}
        >
          <Instagram width={48} height={48} />
          <span className="text-caption-01 w-full text-center">인스타그램</span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          className="flex w-[72px] flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={handleSaveImage}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
            <Download width={28} height={28} />
          </span>
          <span className="text-caption-01 w-full text-center">
            {isSaving ? '저장 중...' : '이미지 저장'}
          </span>
        </button>
        <button
          type="button"
          className="flex w-[72px] flex-col items-center gap-2 text-white"
          onClick={onOptionsClick}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
            <Filter width={28} height={28} />
          </span>
          <span className="text-caption-01 w-full text-center">공유 설정</span>
        </button>
      </div>
    </>
  );
}
