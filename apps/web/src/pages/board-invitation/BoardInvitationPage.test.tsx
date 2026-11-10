import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { publicBoardInvitationFixture } from '@/entities/board/api/__fixtures__/board-invitation.fixture';
import type { BoardInvitationDetail } from '@/entities/board/api/board-api';
import { ToastProvider } from '@/shared/ui/common/Toast';

import { BoardInvitationPage } from './BoardInvitationPage';

const mocks = vi.hoisted(() => ({
  copyTextToClipboard: vi.fn(),
  openBoardInvitationInApp: vi.fn(),
}));

vi.mock('@/shared/lib/copy-text-to-clipboard', () => ({
  copyTextToClipboard: mocks.copyTextToClipboard,
}));
vi.mock('./model/open-board-invitation-in-app', () => ({
  openBoardInvitationInApp: mocks.openBoardInvitationInApp,
}));

vi.mock('next/image', () => ({
  default: ({
    alt = '',
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

describe('BoardInvitationPage', () => {
  beforeEach(() => {
    mocks.copyTextToClipboard.mockReset();
    mocks.copyTextToClipboard.mockResolvedValue(undefined);
    mocks.openBoardInvitationInApp.mockReset();
  });

  const renderPage = (invitation: BoardInvitationDetail = publicBoardInvitationFixture) =>
    render(
      <ToastProvider>
        <BoardInvitationPage invitation={invitation} />
      </ToastProvider>,
    );

  it('초대 정보와 미리보기를 표시한다', () => {
    renderPage();

    expect(screen.getByText("김용희님이 '제주 여행' 보드에 초대했어요")).toBeInTheDocument();
    expect(screen.getByText('참여자 2명 · 스티커 9개')).toBeInTheDocument();
    expect(screen.getByText('K7P2QX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '초대 코드 복사' })).toBeInTheDocument();
    expect(screen.getByAltText('제주 여행 보드 미리보기')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '앱에서 참여하기' })).toBeEnabled();
  });

  it('미리보기 이미지가 없으면 기본 로고를 표시한다', () => {
    renderPage({ ...publicBoardInvitationFixture, previewImageUrl: null });

    expect(screen.queryByAltText('제주 여행 보드 미리보기')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'PPOTTO 기본 미리보기' })).toBeInTheDocument();
  });

  it('초대 코드를 복사하고 완료 토스트를 표시한다', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '초대 코드 복사' }));

    expect(mocks.copyTextToClipboard).toHaveBeenCalledWith('K7P2QX');
    expect(await screen.findByText('초대 코드를 복사했어요')).toBeInTheDocument();
  });

  it('앱에서 참여하기를 누르면 초대 코드를 앱 딥링크로 전달한다', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '앱에서 참여하기' }));

    expect(mocks.openBoardInvitationInApp).toHaveBeenCalledWith('K7P2QX');
  });

  it('참여 인원이 가득 차면 참여 버튼을 비활성화한다', () => {
    renderPage({
      ...publicBoardInvitationFixture,
      participantCount: publicBoardInvitationFixture.maxParticipantCount,
    });

    expect(screen.getByRole('button', { name: '참여 인원이 모두 찼어요' })).toBeDisabled();
  });
});
