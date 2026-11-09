import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { boardInvitationFixture } from '@/entities/board/api/__fixtures__/board-invitation.fixture';

const mocks = vi.hoisted(() => ({ refetch: vi.fn(), useBoardInvitationQuery: vi.fn() }));

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ pop: vi.fn() }),
}));
vi.mock('@/entities/board/api/board-queries', () => ({
  useBoardInvitationQuery: mocks.useBoardInvitationQuery,
}));
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
