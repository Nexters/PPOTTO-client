import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { HomeAddMenu } from './HomeAddMenu';

it('추가 버튼으로 액션 메뉴를 열고 닫는다', async () => {
  const user = userEvent.setup();
  render(<HomeAddMenu />);

  await user.click(screen.getByRole('button', { name: '보드 추가 메뉴 열기' }));

  expect(screen.getByRole('button', { name: '보드 추가 메뉴 닫기' })).toHaveClass('bg-gray-800');
  expect(screen.getByRole('button', { name: '새 보드 만들기' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '코드로 참여하기' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: '보드 추가 메뉴 닫기' }));

  expect(screen.queryByRole('button', { name: '새 보드 만들기' })).not.toBeInTheDocument();
});

it('액션을 실행하고 메뉴를 닫는다', async () => {
  const user = userEvent.setup();
  const onJoinByCode = vi.fn();
  render(<HomeAddMenu onJoinByCode={onJoinByCode} />);

  await user.click(screen.getByRole('button', { name: '보드 추가 메뉴 열기' }));
  await user.click(screen.getByRole('button', { name: '코드로 참여하기' }));

  expect(onJoinByCode).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: '코드로 참여하기' })).not.toBeInTheDocument();
});

it('바깥 영역을 누르면 메뉴를 닫는다', async () => {
  const user = userEvent.setup();
  render(
    <>
      <HomeAddMenu />
      <button type="button">바깥 영역</button>
    </>,
  );

  await user.click(screen.getByRole('button', { name: '보드 추가 메뉴 열기' }));
  await user.click(screen.getByRole('button', { name: '바깥 영역' }));

  expect(screen.queryByRole('button', { name: '새 보드 만들기' })).not.toBeInTheDocument();
});
