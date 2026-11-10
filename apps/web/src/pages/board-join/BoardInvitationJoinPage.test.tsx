import { HttpError } from '@ppotto/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  join: vi.fn(),
  pop: vi.fn(),
  replace: vi.fn(),
  toast: vi.fn(),
  isPending: false,
  handlers: undefined as
    { onSuccess: (data: unknown) => void; onError: (error: Error) => void } | undefined,
}));

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ pop: mocks.pop, replace: mocks.replace }),
}));
vi.mock('@/entities/board/api/board-mutations', () => ({
  useJoinBoardInvitationMutation: (handlers: typeof mocks.handlers) => {
    mocks.handlers = handlers;
    return { mutate: mocks.join, isPending: mocks.isPending };
  },
}));
vi.mock('@/shared/ui/common/Toast', () => ({ useToast: () => mocks.toast }));
vi.mock('@/features/board-invitation', () => ({
  clearPendingBoardInvitation: vi.fn().mockResolvedValue(undefined),
}));

import { BoardInvitationJoinPage } from './BoardInvitationJoinPage';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isPending = false;
  mocks.handlers = undefined;
});

it('초대 코드로 참여하고 응답으로 받은 보드로 바로 이동한다', async () => {
  mocks.join.mockImplementation(() => {
    mocks.handlers?.onSuccess({ boardId: 'board-1', boardName: '제주 여행', role: 'MEMBER' });
  });

  render(<BoardInvitationJoinPage code="K7P2QX" />);

  expect(mocks.join).toHaveBeenCalledWith({ code: 'K7P2QX' });
  await waitFor(() =>
    expect(mocks.replace).toHaveBeenCalledWith('Board', { boardId: 'board-1' }, { animate: false }),
  );
  expect(mocks.toast).toHaveBeenCalledWith("'제주 여행' 보드에 참여했어요");
});

it('참여에 실패하면 안내하고 다시 시도할 수 있다', () => {
  mocks.join.mockImplementationOnce(() => mocks.handlers?.onError(new Error('offline')));

  render(<BoardInvitationJoinPage code="K7P2QX" />);

  expect(mocks.toast).toHaveBeenCalledWith('보드에 참여하지 못했어요');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(mocks.join).toHaveBeenCalledTimes(2);
});

it.each([
  [new HttpError(404, 'BOARD-006', null), '유효하지 않거나 만료된 초대예요'],
  [new HttpError(409, 'BOARD-009', null), '참여 인원이 모두 찼어요'],
])('다시 시도할 수 없는 참여 실패는 안내 후 홈으로 이동한다', async (error, message) => {
  mocks.join.mockImplementation(() => mocks.handlers?.onError(error));

  render(<BoardInvitationJoinPage code="K7P2QX" />);

  expect(mocks.toast).toHaveBeenCalledWith(message);
  await waitFor(() => expect(mocks.pop).toHaveBeenCalledWith({ animate: false }));
  expect(mocks.replace).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
});
