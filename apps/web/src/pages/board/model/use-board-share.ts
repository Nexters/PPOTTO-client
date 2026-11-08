import { useRef, useState } from 'react';

import { useShareBoardMutation } from '@/entities/board/api/board-mutations';
import { useBoardShareStatusQuery } from '@/entities/board/api/board-queries';
import { saveImageToDevice } from '@/features/save-image-to-device';
import { blobToBase64 } from '@/shared/lib/blob-to-base64';
import { bridge } from '@/shared/lib/bridge';
import { captureElementAsBlob } from '@/shared/lib/capture-element-as-blob';
import { useToast } from '@/shared/ui/common/Toast';

import type { BoardShareScope } from './board-share-scope';

// 공유 카드는 400px이라 3배로 캡처해야 저장·스토리 이미지가 흐려지지 않는다
const SHARE_CARD_PIXEL_RATIO = 3;

// isOpen: 공유 화면이 열려 있을 때만 내 공유 상태를 조회한다
export function useBoardShare(boardId: string | undefined, isOpen: boolean) {
  const toast = useToast();
  const { data: shareStatus } = useBoardShareStatusQuery(boardId, isOpen);
  const { mutate: shareBoard } = useShareBoardMutation();
  const [isSaving, setIsSaving] = useState(false);
  const [isSharingInstagram, setIsSharingInstagram] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const changeScope = (scope: BoardShareScope) => {
    if (!boardId || scope === shareStatus?.scope) return;
    shareBoard({ boardId, scope }, { onError: () => toast('공유 설정 저장에 실패했습니다') });
  };

  const captureShareImage = async () => {
    const card = cardRef.current;
    if (!card) throw new Error('공유 이미지를 만들 화면이 준비되지 않았습니다.');
    return captureElementAsBlob(card, { skipFonts: true, pixelRatio: SHARE_CARD_PIXEL_RATIO });
  };

  const saveImage = async () => {
    if (isSaving) return false;
    setIsSaving(true);
    try {
      const success = await saveImageToDevice(await captureShareImage());
      toast(success ? '이미지가 저장되었습니다' : '이미지 저장에 실패했습니다');
      return success;
    } catch (error) {
      console.error('보드 이미지 저장 실패', error);
      toast('이미지 저장에 실패했습니다');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const shareInstagram = async () => {
    if (isSharingInstagram) return false;
    setIsSharingInstagram(true);
    try {
      const base64 = await blobToBase64(await captureShareImage());
      const { success } = await bridge.request('SHARE_INSTAGRAM_STORY', { base64 });
      if (!success) toast('인스타그램 공유에 실패했습니다');
      return success;
    } catch (error) {
      console.error('보드 인스타그램 공유 실패', error);
      toast('인스타그램 공유에 실패했습니다');
      return false;
    } finally {
      setIsSharingInstagram(false);
    }
  };

  return {
    scope: shareStatus?.scope,
    changeScope,
    isSaving,
    isSharingInstagram,
    isCapturing: isSaving || isSharingInstagram,
    cardRef,
    saveImage,
    shareInstagram,
  };
}
