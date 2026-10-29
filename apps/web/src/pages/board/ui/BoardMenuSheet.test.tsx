import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BoardMenuSheet } from './BoardMenuSheet';

describe('BoardMenuSheet', () => {
  it('오너에게 이름 변경과 삭제 메뉴를 보여준다', () => {
    render(<BoardMenuSheet isOpen onClose={vi.fn()} role="OWNER" />);

    expect(screen.getByRole('button', { name: '이름 변경하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '나가기' })).not.toBeInTheDocument();
  });

  it('멤버에게 나가기 메뉴를 보여준다', () => {
    render(<BoardMenuSheet isOpen onClose={vi.fn()} role="MEMBER" />);

    expect(screen.getByRole('button', { name: '나가기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이름 변경하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
  });

  it('역할을 불러오기 전에는 역할 전용 메뉴를 표시하지 않는다', () => {
    render(<BoardMenuSheet isOpen onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '나가기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이름 변경하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
  });

  it('바텀시트를 닫을 수 있다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BoardMenuSheet isOpen onClose={onClose} role="MEMBER" />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });
});
