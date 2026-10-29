import { useIssueBoardInvitationMutation } from '@/entities/board/api/board-mutations';
import { useToast } from '@/shared/ui/common/Toast';

export function useBoardInvitation(boardId?: string) {
  const toast = useToast();
  const { mutateAsync, isPending } = useIssueBoardInvitationMutation();

  const issueInvitation = async () => {
    if (!boardId || isPending) return null;

    try {
      return await mutateAsync(boardId);
    } catch {
      toast('초대 코드를 불러오지 못했어요');
      return null;
    }
  };

  return {
    issueInvitation,
    isInvitationPending: isPending,
  };
}
