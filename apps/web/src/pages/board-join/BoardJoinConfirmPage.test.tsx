import { HttpError } from '@ppotto/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { boardInvitationFixture } from '@/entities/board/api/__fixtures__/board-invitation.fixture';

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  useBoardInvitationQuery: vi.fn(),
  join: vi.fn(),
  push: vi.fn(),
  pop: vi.fn(),
  toast: vi.fn(),
  handlers: undefined as
    { onSuccess: (data: unknown) => void; onError: (error: Error) => void } | undefined,
}));

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ pop: mocks.pop, push: mocks.push }),
}));
vi.mock('@/entities/board/api/board-mutations', () => ({
  useJoinBoardInvitationMutation: (handlers: typeof mocks.handlers) => {
    mocks.handlers = handlers;
    return {
      mutate: mocks.join,
    };
  },
}));
vi.mock('@/entities/board/api/board-queries', () => ({
  useBoardInvitationQuery: mocks.useBoardInvitationQuery,
}));
vi.mock('@/shared/ui/common/Toast', () => ({ useToast: () => mocks.toast }));
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ComponentProps<'img'> & {
    fill?: boolean;
    priority?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- next/image 대체 mock
    <img {...props} />
  ),
}));

import { BoardJoinConfirmPage } from './BoardJoinConfirmPage';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.handlers = undefined;
  mocks.useBoardInvitationQuery.mockReturnValue({
    data: boardInvitationFixture,
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  });
});

it('조회한 초대 정보와 참여 확인 내용을 표시한다', () => {
  render(<BoardJoinConfirmPage code="K7P2QX" />);

  expect(screen.getByText("김용희님이 '제주 여행' 보드에 초대했어요")).toBeInTheDocument();
  expect(screen.getByText('참여자 2명 · 스티커 9개')).toBeInTheDocument();
  expect(screen.getByText('김용희님(방장), 이수민님')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '참여하기' })).toBeEnabled();
});

it('참여자가 5명 이상이면 이름을 균형 있게 두 줄로 배치한다', () => {
  mocks.useBoardInvitationQuery.mockReturnValue({
    data: {
      ...boardInvitationFixture,
      participantCount: 5,
      participants: [
        { name: '김용희', role: 'OWNER' },
        { name: '이수민', role: 'MEMBER' },
        { name: '박지훈', role: 'MEMBER' },
        { name: '최민지', role: 'MEMBER' },
        { name: '윤아름', role: 'MEMBER' },
      ],
    },
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  });

  render(<BoardJoinConfirmPage code="K7P2QX" />);

  expect(screen.getByText('김용희님(방장), 이수민님, 박지훈님')).toBeInTheDocument();
  expect(screen.getByText('최민지님, 윤아름님')).toBeInTheDocument();
});

it('참여에 성공하면 참여 화면을 정리하고 응답으로 받은 보드로 이동한다', () => {
  mocks.join.mockImplementation(() => {
    mocks.handlers?.onSuccess({ boardId: 'board-1', boardName: '제주 여행', role: 'MEMBER' });
  });
  render(<BoardJoinConfirmPage code="K7P2QX" />);

  fireEvent.click(screen.getByRole('button', { name: '참여하기' }));

  expect(mocks.join).toHaveBeenCalledWith({ code: 'K7P2QX' });
  expect(mocks.pop).toHaveBeenCalledWith(2, { animate: false });
  expect(mocks.push).toHaveBeenCalledWith('Board', { boardId: 'board-1' });
});

it.each([
  [new HttpError(404, 'BOARD-006', null), '유효하지 않거나 만료된 초대예요'],
  [new HttpError(409, 'BOARD-009', null), '참여 인원이 모두 찼어요'],
  [new Error('offline'), '보드에 참여하지 못했어요'],
])('참여 실패 원인에 맞는 안내를 보여준다', (error, message) => {
  mocks.join.mockImplementation(() => mocks.handlers?.onError(error));
  render(<BoardJoinConfirmPage code="K7P2QX" />);

  fireEvent.click(screen.getByRole('button', { name: '참여하기' }));

  expect(mocks.toast).toHaveBeenCalledWith(message);
});

it('참여 요청 중에는 참여 버튼을 비활성화한다', () => {
  render(<BoardJoinConfirmPage code="K7P2QX" />);

  fireEvent.click(screen.getByRole('button', { name: '참여하기' }));

  expect(screen.getByRole('button', { name: '참여하기' })).toBeDisabled();
});

it('정원이 찼으면 신규 참여는 막고 기존 참여자는 보드에 다시 들어갈 수 있다', () => {
  mocks.useBoardInvitationQuery.mockReturnValue({
    data: {
      ...boardInvitationFixture,
      participantCount: 8,
      maxParticipantCount: 8,
      viewerStatus: 'NOT_JOINED',
    },
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  });
  const { rerender } = render(<BoardJoinConfirmPage code="K7P2QX" />);
  expect(screen.getByRole('button', { name: '참여 인원이 모두 찼어요' })).toBeDisabled();

  mocks.useBoardInvitationQuery.mockReturnValue({
    data: {
      ...boardInvitationFixture,
      participantCount: 8,
      maxParticipantCount: 8,
      viewerStatus: 'MEMBER',
    },
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  });
  rerender(<BoardJoinConfirmPage code="K7P2QX" />);
  expect(screen.getByRole('button', { name: '보드 들어가기' })).toBeEnabled();
});
