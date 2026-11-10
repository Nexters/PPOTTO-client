import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardInvitationContent } from './BoardInvitationContent';

describe('BoardInvitationContent', () => {
  it('발급받은 초대 코드와 공유 버튼을 표시한다', () => {
    render(<BoardInvitationContent code="K7P2QX" onCopy={vi.fn()} />);

    expect(screen.getByText('K7P2QX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오톡' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '인스타그램' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '복사' })).toBeEnabled();
  });

  it('카카오톡 공유 동작을 받으면 버튼이 활성화된다', () => {
    render(<BoardInvitationContent code="K7P2QX" onCopy={vi.fn()} onKakaoShare={vi.fn()} />);

    expect(screen.getByRole('button', { name: '카카오톡' })).toBeEnabled();
  });

  it('인스타그램 공유 동작을 받으면 버튼이 활성화된다', () => {
    render(<BoardInvitationContent code="K7P2QX" onCopy={vi.fn()} onInstagramShare={vi.fn()} />);

    expect(screen.getByRole('button', { name: '인스타그램' })).toBeEnabled();
  });

  it('복사 버튼을 누르면 전달받은 동작을 실행한다', () => {
    const onCopy = vi.fn();
    render(<BoardInvitationContent code="K7P2QX" onCopy={onCopy} />);

    fireEvent.click(screen.getByRole('button', { name: '복사' }));

    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('카카오톡 버튼을 누르면 전달받은 동작을 실행한다', () => {
    const onKakaoShare = vi.fn();
    render(<BoardInvitationContent code="K7P2QX" onCopy={vi.fn()} onKakaoShare={onKakaoShare} />);

    fireEvent.click(screen.getByRole('button', { name: '카카오톡' }));

    expect(onKakaoShare).toHaveBeenCalledOnce();
  });

  it('인스타그램 버튼을 누르면 전달받은 동작을 실행한다', () => {
    const onInstagramShare = vi.fn();
    render(
      <BoardInvitationContent code="K7P2QX" onCopy={vi.fn()} onInstagramShare={onInstagramShare} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '인스타그램' }));

    expect(onInstagramShare).toHaveBeenCalledOnce();
  });
});
