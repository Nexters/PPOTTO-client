import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import type { BoardParticipants } from '@/entities/board/api/board-api';

import { BoardParticipantsContent } from './BoardParticipantsContent';

const participants = {
  participantCount: 2,
  maxParticipantCount: 8,
  participants: [
    {
      userId: 'user-1',
      name: '김용희',
      role: 'OWNER',
    },
    {
      userId: 'user-2',
      name: '이수민',
      role: 'MEMBER',
    },
  ],
} satisfies BoardParticipants;

it('로딩 중에는 참여자 목록 형태의 스켈레톤을 표시한다', () => {
  const { container } = render(
    <BoardParticipantsContent isPending isError={false} onRetry={vi.fn()} onInvite={vi.fn()} />,
  );

  expect(screen.getByRole('status', { name: '참여자 목록 불러오는 중' })).toBeInTheDocument();
  expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
});

it('알고 있는 참여자 수와 초대하기 자리에 맞춰 스켈레톤을 표시한다', () => {
  const { container } = render(
    <BoardParticipantsContent
      expectedParticipantCount={7}
      isPending
      isError={false}
      onRetry={vi.fn()}
      onInvite={vi.fn()}
    />,
  );

  expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(8);
});

it('참여자 수와 이름을 표시하고 현재 사용자에게 나를 표시한다', () => {
  render(
    <BoardParticipantsContent
      data={participants}
      currentUserId="user-1"
      isPending={false}
      isError={false}
      onRetry={vi.fn()}
      onInvite={vi.fn()}
    />,
  );

  expect(screen.getByRole('heading', { name: '참여자 2명' })).toBeInTheDocument();
  expect(screen.getByText('김용희(나)')).toBeInTheDocument();
  expect(screen.getByText('이수민')).toBeInTheDocument();
});

it('정원이 남아 있으면 초대하기를 표시하고 클릭 동작을 전달한다', () => {
  const onInvite = vi.fn();
  render(
    <BoardParticipantsContent
      data={participants}
      currentUserId="user-1"
      isPending={false}
      isError={false}
      onRetry={vi.fn()}
      onInvite={onInvite}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: '초대하기' }));

  expect(onInvite).toHaveBeenCalledOnce();
});

it('정원이 가득 차면 초대하기를 표시하지 않는다', () => {
  render(
    <BoardParticipantsContent
      data={{ ...participants, participantCount: 8, maxParticipantCount: 8 }}
      currentUserId="user-1"
      isPending={false}
      isError={false}
      onRetry={vi.fn()}
      onInvite={vi.fn()}
    />,
  );

  expect(screen.queryByRole('button', { name: '초대하기' })).not.toBeInTheDocument();
});

it('초대 발급 중에는 초대하기를 비활성화한다', () => {
  render(
    <BoardParticipantsContent
      data={participants}
      currentUserId="user-1"
      isPending={false}
      isError={false}
      onRetry={vi.fn()}
      onInvite={vi.fn()}
      isInvitePending
    />,
  );

  expect(screen.getByRole('button', { name: '초대하기' })).toBeDisabled();
});

it('참여자 목록 조회에 실패하면 다시 시도할 수 있다', () => {
  const onRetry = vi.fn();
  render(
    <BoardParticipantsContent isPending={false} isError onRetry={onRetry} onInvite={vi.fn()} />,
  );

  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

  expect(onRetry).toHaveBeenCalledOnce();
});

it('기존 목록이 있으면 재조회에 실패해도 목록을 유지한다', () => {
  render(
    <BoardParticipantsContent
      data={participants}
      currentUserId="user-1"
      isPending={false}
      isError
      onRetry={vi.fn()}
      onInvite={vi.fn()}
    />,
  );

  expect(screen.getByText('김용희(나)')).toBeInTheDocument();
  expect(screen.queryByText('참여자 목록을 불러오지 못했어요')).not.toBeInTheDocument();
});
