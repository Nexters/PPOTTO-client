import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BoardHeader } from './BoardHeader';

describe('BoardHeader', () => {
  it('보드 이름과 오너를 포함한 참여자 수를 표시한다', () => {
    render(
      <BoardHeader title="제주 여행" participantCount={8} onBack={vi.fn()} onOpenMenu={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: '제주 여행' })).toBeInTheDocument();
    expect(screen.getByLabelText('참여자 8명')).toHaveTextContent('8');
  });

  it('뒤로가기 버튼을 누르면 전달받은 동작을 실행한다', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<BoardHeader title="제주 여행" onBack={onBack} onOpenMenu={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '뒤로가기' }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it('보드 메뉴 버튼을 누르면 전달받은 동작을 실행한다', async () => {
    const user = userEvent.setup();
    const onOpenMenu = vi.fn();
    render(<BoardHeader title="제주 여행" onBack={vi.fn()} onOpenMenu={onOpenMenu} />);

    await user.click(screen.getByRole('button', { name: '보드 메뉴 열기' }));

    expect(onOpenMenu).toHaveBeenCalledOnce();
  });

  it('제목을 누르면 전달받은 동작을 실행한다', async () => {
    const user = userEvent.setup();
    const onTitleClick = vi.fn();
    render(
      <BoardHeader
        title="제주 여행"
        onBack={vi.fn()}
        onOpenMenu={vi.fn()}
        onTitleClick={onTitleClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: '보드 가운데로 보기' }));

    expect(onTitleClick).toHaveBeenCalledOnce();
  });
});
