import {
  INVITATION_PREVIEW_HEIGHT,
  INVITATION_PREVIEW_WIDTH,
} from '../model/board-invitation-preview-layout';

import { BoardPreviewCanvas } from './BoardPreviewCanvas';

export function BoardInvitationPreviewCard({ boardId }: { boardId: string }) {
  return (
    <BoardPreviewCanvas
      boardId={boardId}
      width={INVITATION_PREVIEW_WIDTH}
      height={INVITATION_PREVIEW_HEIGHT}
    />
  );
}
