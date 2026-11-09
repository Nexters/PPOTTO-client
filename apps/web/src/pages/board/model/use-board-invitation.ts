import { useRef, useState } from 'react';

import {
  useIssueBoardInvitationMutation,
  useUploadBoardInvitationPreviewMutation,
} from '@/entities/board/api/board-mutations';
import { captureElementAsBlob } from '@/shared/lib/capture-element-as-blob';
import { copyTextToClipboard } from '@/shared/lib/copy-text-to-clipboard';
import { useToast } from '@/shared/ui/common/Toast';

import { INVITATION_PREVIEW_PIXEL_RATIO } from './board-invitation-preview-layout';

const WEBP_QUALITY = 0.9;

function waitForPreviewPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function useBoardInvitation(boardId?: string) {
  const toast = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isPreviewPreparing, setIsPreviewPreparing] = useState(false);
  const { mutateAsync, isPending } = useIssueBoardInvitationMutation();
  const { mutateAsync: uploadPreview } = useUploadBoardInvitationPreviewMutation();

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

  return {
    previewRef,
    isPreviewPreparing,
    issueInvitation,
    copyInvitationCode,
    isInvitationPending: isPending,
  };
}
