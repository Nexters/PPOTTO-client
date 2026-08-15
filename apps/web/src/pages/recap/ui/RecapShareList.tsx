import { Download, Filter, Instagram, Kakaotalk } from '@ppotto/assets';
import { useState, type RefObject } from 'react';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { useMeQuery } from '@/entities/user/api/user-queries';
import { saveImageToDevice } from '@/features/save-image-to-device';
import { blobToBase64 } from '@/shared/lib/blob-to-base64';
import { bridge } from '@/shared/lib/bridge';
import { canvasToBlob } from '@/shared/lib/canvas-to-blob';
import { captureElementAsBlob, captureElementAsCanvas } from '@/shared/lib/capture-element-as-blob';
import { cropCanvasToSquare } from '@/shared/lib/crop-canvas-to-square';
import { useToast } from '@/shared/ui/common/Toast';

type RecapShareListProps = {
  cardRef: RefObject<HTMLDivElement | null>;
  data: StickerRecap;
  onOptionsClick: () => void;
  onSaved: () => void;
};

export function RecapShareList({ cardRef, data, onOptionsClick, onSaved }: RecapShareListProps) {
  const toast = useToast();
  const { data: me } = useMeQuery();
  const [isSaving, setIsSaving] = useState(false);
  const [isSharingInstagram, setIsSharingInstagram] = useState(false);
  const [isSharingKakao, setIsSharingKakao] = useState(false);
  const tags = data.comments
    .filter((comment) => comment.posX == null)
    .map((comment) => comment.content);

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
    try {
      const blob = await captureElementAsBlob(cardRef.current, { skipFonts: true, pixelRatio: 1 });
      const success = await saveImageToDevice(blob);
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
      const blob = await captureElementAsBlob(cardRef.current, { skipFonts: true, pixelRatio: 1 });
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

  const handleKakaoShare = async () => {
    if (!cardRef.current || !window.Kakao) return;
    setIsSharingKakao(true);
    try {
      const canvas = await captureElementAsCanvas(cardRef.current, {
        skipFonts: true,
        pixelRatio: 1,
      });
      const cropped = cropCanvasToSquare(canvas);
      const blob = await canvasToBlob(cropped);
      const { infos } = await window.Kakao.Share.uploadImage({ file: blob });

      const { success } = await bridge.request('SHARE_KAKAO', {
        templateArgs: {
          IMAGE_URL: infos.original.url,
          USER_NAME: me?.name ?? '',
          STICKER_NAME: data.sticker.title,
          KEYWORDS: tags.join(', '),
        },
      });
      if (success) onSaved();
      else toast('카카오톡 공유에 실패했습니다');
    } catch (error) {
      console.error('카카오톡 공유 실패', error);
      toast('카카오톡 공유에 실패했습니다');
    } finally {
      setIsSharingKakao(false);
    }
  };

  return (
    <>
      <span className="text-body-01 text-white">공유하기</span>
      <div className="flex w-full items-start justify-between">
        <button
          type="button"
          disabled={isSharingKakao}
          className="flex w-18 flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={handleKakaoShare}
        >
          <Kakaotalk width={48} height={48} />
          <span className="text-caption-01 w-full text-center">카카오톡</span>
        </button>
        <button
          type="button"
          disabled={isSharingInstagram}
          className="flex w-18 flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={handleInstagramShare}
        >
          <Instagram width={48} height={48} />
          <span className="text-caption-01 w-full text-center">인스타그램</span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          className="flex w-18 flex-col items-center gap-2 text-white disabled:opacity-50"
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
          className="flex w-18 flex-col items-center gap-2 text-white"
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
