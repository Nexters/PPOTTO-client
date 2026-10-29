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
        role="OWNER"
        view={{ type: 'menu' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '초대하기' }));

    expect(onInvite).toHaveBeenCalledOnce();
  });

  it('코드가 발급되면 같은 바텀시트 안에서 초대 화면을 표시한다', () => {
    render(
      <BoardMenuSheet
        isOpen
        onClose={vi.fn()}
        onInvite={vi.fn()}
        role="OWNER"
        view={{ type: 'invitation', code: 'K7P2QX' }}
      />,
    );

    expect(screen.getByText('K7P2QX')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이름 변경하기' })).not.toBeInTheDocument();
  });
});
