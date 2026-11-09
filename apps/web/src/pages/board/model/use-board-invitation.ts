import { useRef, useState } from 'react';

import {
  useIssueBoardInvitationMutation,
  useUploadBoardInvitationPreviewMutation,
} from '@/entities/board/api/board-mutations';
import { useBoardQuery } from '@/entities/board/api/board-queries';
import { useMeQuery } from '@/entities/user/api/user-queries';
import { bridge } from '@/shared/lib/bridge';
import { captureElementAsBlob } from '@/shared/lib/capture-element-as-blob';
import { copyTextToClipboard } from '@/shared/lib/copy-text-to-clipboard';
import { useToast } from '@/shared/ui/common/Toast';

import {
  INVITATION_PREVIEW_PIXEL_RATIO,
  KAKAO_SHARE_PIXEL_RATIO,
} from './board-invitation-preview-layout';

const WEBP_QUALITY = 0.9;
// 보드 초대용 피드 템플릿 ID
const BOARD_INVITE_KAKAO_TEMPLATE_ID = 138784;

function waitForPreviewPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function useBoardInvitation(boardId?: string) {
  const toast = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const kakaoCardRef = useRef<HTMLDivElement>(null);
  const [isPreviewPreparing, setIsPreviewPreparing] = useState(false);
  const [isKakaoSharePreparing, setIsKakaoSharePreparing] = useState(false);
  const [kakaoShareNow, setKakaoShareNow] = useState(0);
  const { mutateAsync, isPending } = useIssueBoardInvitationMutation();
  const { mutateAsync: uploadPreview } = useUploadBoardInvitationPreviewMutation();
  const { data: board } = useBoardQuery(boardId);
  const { data: me } = useMeQuery();

  const createAndUploadPreview = async (invitationId: string, code: string) => {
    setIsPreviewPreparing(true);
    try {
      await waitForPreviewPaint();
      const element = previewRef.current;
      if (!element) return;
      const file = await captureElementAsBlob(
        element,
        { skipFonts: true, pixelRatio: INVITATION_PREVIEW_PIXEL_RATIO },
        { type: 'image/webp', quality: WEBP_QUALITY },
      );
      await uploadPreview({ invitationId, code, file });
    } catch (error) {
      console.error('[board-invitation] 미리보기 업로드 실패', error);
    } finally {
      setIsPreviewPreparing(false);
    }
  };

  const issueInvitation = async () => {
    if (!boardId || isPending) return null;

    try {
      const invitation = await mutateAsync(boardId);
      if (invitation.previewRequired) {
        void createAndUploadPreview(invitation.invitationId, invitation.code);
      }
      return invitation;
    } catch {
      toast('초대 코드를 불러오지 못했어요');
      return null;
    }
  };

  const copyInvitationCode = async (code: string) => {
    try {
      await copyTextToClipboard(code);
      toast('초대 코드를 복사했어요');
    } catch {
      toast('초대 코드를 복사하지 못했어요');
    }
  };

  const shareToKakao = async (code: string) => {
    if (!window.Kakao || isKakaoSharePreparing) return;
    setKakaoShareNow(Date.now());
    setIsKakaoSharePreparing(true);
    try {
      await waitForPreviewPaint();
      const element = kakaoCardRef.current;
      if (!element) return;
      const blob = await captureElementAsBlob(
        element,
        { skipFonts: true, pixelRatio: KAKAO_SHARE_PIXEL_RATIO },
        { type: 'image/png' },
      );
      const file = new File([blob], 'ppotto-invite.png', { type: blob.type || 'image/png' });
      const { infos } = await window.Kakao.Share.uploadImage({ file: [file] });

      const { success } = await bridge.request('SHARE_KAKAO', {
        templateId: BOARD_INVITE_KAKAO_TEMPLATE_ID,
        templateArgs: {
          IMAGE_URL: infos.original.url,
          INVITER_NAME: me?.name ?? '',
          BOARD_NAME: board?.name ?? '',
          CODE: code,
          WEB_LINK: `invitations/${code}`,
        },
      });
      if (!success) toast('카카오톡 공유에 실패했어요');
    } catch (error) {
      console.error('[board-invitation] 카카오톡 공유 실패', error);
      toast('카카오톡 공유에 실패했어요');
    } finally {
      setIsKakaoSharePreparing(false);
    }
  };

  return {
    previewRef,
    isPreviewPreparing,
    kakaoCardRef,
    isKakaoSharePreparing,
    kakaoShareNow,
    issueInvitation,
    copyInvitationCode,
    shareToKakao: (code: string) => void shareToKakao(code),
    isInvitationPending: isPending,
  };
}
