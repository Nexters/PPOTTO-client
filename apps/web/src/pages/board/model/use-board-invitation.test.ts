import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mutateAsync, toast } = vi.hoisted(() => ({ mutateAsync: vi.fn(), toast: vi.fn() }));

vi.mock('@/entities/board/api/board-mutations', () => ({
  useIssueBoardInvitationMutation: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('@/shared/ui/common/Toast', () => ({ useToast: () => toast }));

import { useBoardInvitation } from './use-board-invitation';

describe('useBoardInvitation', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    toast.mockReset();
  });

  it('발급에 성공하면 초대 정보를 반환한다', async () => {
    const invitation = { code: 'K7P2QX' };
    mutateAsync.mockResolvedValue(invitation);
    const { result } = renderHook(() => useBoardInvitation('board-1'));

    const issued = await act(() => result.current.issueInvitation());

    expect(mutateAsync).toHaveBeenCalledWith('board-1');
    expect(issued).toBe(invitation);
  });

  it('발급에 실패하면 오류를 안내하고 null을 반환한다', async () => {
    mutateAsync.mockRejectedValue(new Error('failed'));
    const { result } = renderHook(() => useBoardInvitation('board-1'));

    const issued = await act(() => result.current.issueInvitation());

    expect(toast).toHaveBeenCalledWith('초대 코드를 불러오지 못했어요');
    expect(issued).toBeNull();
  });

  it('보드 ID가 없으면 발급하지 않는다', async () => {
    const { result } = renderHook(() => useBoardInvitation());

    const issued = await act(() => result.current.issueInvitation());

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(issued).toBeNull();
  });
});
