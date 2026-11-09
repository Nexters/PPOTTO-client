import { BridgeUnknownMessageError } from 'webview-bridge-kit';
import { useRef, useState } from 'react';

import { useShareBoardMutation } from '@/entities/board/api/board-mutations';
import { useBoardQuery, useBoardShareStatusQuery } from '@/entities/board/api/board-queries';
import { useMeQuery } from '@/entities/user/api/user-queries';
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
  const { mutate: shareBoard, mutateAsync: shareBoardAsync } = useShareBoardMutation();
  const { data: me } = useMeQuery();
  const { data: board } = useBoardQuery(boardId);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharingInstagram, setIsSharingInstagram] = useState(false);
  const [isSharingKakao, setIsSharingKakao] = useState(false);
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

  // 공유 상태를 받기 전에 보내면 저장된 범위를 기본값으로 덮어쓸 수 있어 상태가 있어야만 보낸다
  const shareKakao = async (boardName: string) => {
    if (!boardId || !shareStatus || isSharingKakao) return false;
    setIsSharingKakao(true);
    try {
      if (!window.Kakao) throw new Error('카카오 SDK가 아직 준비되지 않았습니다.');
      const blob = await captureShareImage();
      const file = new File([blob], 'ppotto-board.png', { type: blob.type || 'image/png' });
      const { infos } = await window.Kakao.Share.uploadImage({ file: [file] });
      // 한 번도 공유하지 않은 보드는 지금 범위로 저장해 링크를 만든다. 이미 있으면 같은 링크를 쓴다
      const shareToken =
        shareStatus.shareToken ??
        (await shareBoardAsync({ boardId, scope: shareStatus.scope })).shareToken;

      const { success } = await bridge.request('SHARE_KAKAO_BOARD', {
        templateArgs: {
          IMAGE_URL: infos.original.url,
          USER_NAME: me?.name ?? '',
          BOARD_NAME: boardName,
          // 템플릿 본문(Figma 3356:18842)은 스티커 이름을 쉼표로 잇고, 넘치면 카카오톡이 말줄임한다
          STICKER_NAMES: (board?.stickers ?? [])
            .map((sticker) => sticker.title)
            .filter(Boolean)
            .join(', '),
          WEB_LINK: `${window.location.origin}/share/board/${shareToken}`,
        },
      });
      if (!success) toast('카카오톡 공유에 실패했습니다');
      return success;
    } catch (error) {
      if (error instanceof BridgeUnknownMessageError) {
        toast('앱을 업데이트하면 카카오톡으로 공유할 수 있어요');
        return false;
      }
      console.error('보드 카카오톡 공유 실패', error);
      toast('카카오톡 공유에 실패했습니다');
      return false;
    } finally {
      setIsSharingKakao(false);
    }
  };

  return {
    scope: shareStatus?.scope,
    changeScope,
    isSaving,
    isSharingInstagram,
    isSharingKakao,
    isCapturing: isSaving || isSharingInstagram || isSharingKakao,
    cardRef,
    saveImage,
    shareInstagram,
    shareKakao,
  };
}
