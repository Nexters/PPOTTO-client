import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pop: vi.fn(), replace: vi.fn(), isRoot: false }));

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ pop: mocks.pop, replace: mocks.replace }),
  useActivity: () => ({ isRoot: mocks.isRoot }),
}));

import { BoardNotFound } from './BoardNotFound';

function renderBoardNotFound() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BoardNotFound />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.isRoot = false;
});

it('홈 위에 열린 보드면 홈으로 버튼이 보드를 닫는다', async () => {
  const user = userEvent.setup();
  mocks.isRoot = false;
  renderBoardNotFound();

  expect(screen.getByText('보드를 찾을 수 없어요')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '홈으로' }));

  expect(mocks.pop).toHaveBeenCalledTimes(1);
  expect(mocks.replace).not.toHaveBeenCalled();
});

it('루트로 열린 보드면 홈으로 버튼이 홈으로 교체한다', async () => {
  const user = userEvent.setup();
  mocks.isRoot = true;
  renderBoardNotFound();

  await user.click(screen.getByRole('button', { name: '홈으로' }));

  expect(mocks.replace).toHaveBeenCalledWith('Home', {});
  expect(mocks.pop).not.toHaveBeenCalled();
});
