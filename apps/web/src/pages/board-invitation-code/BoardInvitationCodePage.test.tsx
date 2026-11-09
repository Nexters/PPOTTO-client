import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

const pop = vi.fn();

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ pop }),
}));

import { BoardInvitationCodePage } from './BoardInvitationCodePage';

it('영문과 숫자만 6자리까지 대문자로 입력한다', async () => {
  const user = userEvent.setup();
  render(<BoardInvitationCodePage />);

  const input = screen.getByRole('textbox', { name: '초대 코드' });
  const nextButton = screen.getByRole('button', { name: '다음' });

  expect(nextButton).toBeDisabled();

  await user.type(input, 'k7-p2qx9');

  expect(input).toHaveValue('K7P2QX');
  expect(screen.getByText('6/6')).toHaveClass('text-white');
  expect(nextButton).toBeEnabled();
});

it('뒤로 가기 버튼으로 이전 화면으로 이동한다', async () => {
  const user = userEvent.setup();
  render(<BoardInvitationCodePage />);

  await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

  expect(pop).toHaveBeenCalledOnce();
});
