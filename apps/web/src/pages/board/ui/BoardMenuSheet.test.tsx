import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BoardMenuSheet } from './BoardMenuSheet';

describe('BoardMenuSheet', () => {
  const renderSheet = (role?: 'OWNER' | 'MEMBER') =>
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role={role}
        view={{ type: 'menu' }}
      />,
    );

  it('오너에게 이름 변경과 삭제 메뉴를 보여준다', () => {
    renderSheet('OWNER');

    expect(screen.getByRole('button', { name: '이름 변경하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '나가기' })).not.toBeInTheDocument();
  });

  it('멤버에게 나가기 메뉴를 보여준다', () => {
    renderSheet('MEMBER');

    expect(screen.getByRole('button', { name: '나가기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이름 변경하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
  });

  it('역할을 불러오기 전에는 역할 전용 메뉴를 표시하지 않는다', () => {
    renderSheet();

    expect(screen.queryByRole('button', { name: '나가기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이름 변경하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
  });

  it('바텀시트를 닫을 수 있다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <BoardMenuSheet
        isOpen
        onClose={onClose}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="MEMBER"
        view={{ type: 'menu' }}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('초대하기를 누르면 전달받은 동작을 실행한다', () => {
    const onInvite = vi.fn();
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={onInvite}
        onCopyInvitation={vi.fn()}
        role="OWNER"
        view={{ type: 'menu' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '초대하기' }));

    expect(onInvite).toHaveBeenCalledOnce();
  });

  it('참여자를 누르면 참여자 화면으로 전환을 요청한다', () => {
    const onViewChange = vi.fn();
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="OWNER"
        view={{ type: 'menu' }}
        onViewChange={onViewChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '참여자' }));

    expect(onViewChange).toHaveBeenCalledWith({ type: 'participants' });
  });

  it('참여자 화면에 참여자 콘텐츠를 표시한다', () => {
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="OWNER"
        view={{ type: 'participants' }}
        participantList={{
          data: {
            participantCount: 2,
            maxParticipantCount: 8,
            participants: [
              { userId: 'user-1', name: '김용희', role: 'OWNER' },
              { userId: 'user-2', name: '이수민', role: 'MEMBER' },
            ],
          },
          currentUserId: 'user-1',
          isPending: false,
          isError: false,
          onRetry: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: '참여자 2명' })).toBeInTheDocument();
  });

  const shareActions = {
    hasStickers: true,
    isSaving: false,
    isSharingInstagram: false,
    onInstagramShare: vi.fn(),
    onSaveImage: vi.fn(),
  };

  it('공유하기를 누르면 공유 화면으로 전환을 요청한다', () => {
    const onViewChange = vi.fn();
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="OWNER"
        view={{ type: 'menu' }}
        onViewChange={onViewChange}
        share={shareActions}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '공유하기' }));

    expect(onViewChange).toHaveBeenCalledWith({ type: 'share' });
  });

  it('공유 동작이 없거나 공유가 막힌 보드에서는 공유하기를 비활성화한다', () => {
    const { rerender } = render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="OWNER"
        view={{ type: 'menu' }}
      />,
    );

    expect(screen.getByRole('button', { name: '공유하기' })).toBeDisabled();

    rerender(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="MEMBER"
        view={{ type: 'menu' }}
        share={shareActions}
        isShareDisabled
      />,
    );

    expect(screen.getByRole('button', { name: '공유하기' })).toBeDisabled();
  });

  it('공유 화면에서 공유 설정을 누르면 공유 설정 화면으로 전환을 요청한다', () => {
    const onViewChange = vi.fn();
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="OWNER"
        view={{ type: 'share' }}
        onViewChange={onViewChange}
        share={shareActions}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '공유 설정' }));

    expect(onViewChange).toHaveBeenCalledWith({ type: 'shareScope' });
  });

  it('공유 설정 화면에서 범위를 고르거나 뒤로 갈 수 있다', () => {
    const onViewChange = vi.fn();
    const onShareScopeChange = vi.fn();
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="OWNER"
        view={{ type: 'shareScope' }}
        onViewChange={onViewChange}
        shareScope="RECAP"
        onShareScopeChange={onShareScopeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '보드만' }));
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }));

    expect(onShareScopeChange).toHaveBeenCalledWith('BOARD');
    expect(onViewChange).toHaveBeenCalledWith({ type: 'share' });
  });

  it('코드가 발급되면 같은 바텀시트 안에서 초대 화면을 표시한다', () => {
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        onCopyInvitation={vi.fn()}
        role="OWNER"
        view={{ type: 'invitation', code: 'K7P2QX' }}
      />,
    );

    expect(screen.getByText('K7P2QX')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이름 변경하기' })).not.toBeInTheDocument();
  });
});
