import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpError } from '@ppotto/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

import { boardInvitationFixture } from '@/entities/board/api/__fixtures__/board-invitation.fixture';
import { ToastProvider } from '@/shared/ui/common/Toast';

const mocks = vi.hoisted(() => ({ getInvitation: vi.fn(), pop: vi.fn(), push: vi.fn() }));

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ pop: mocks.pop, push: mocks.push }),
}));
vi.mock('@/entities/board/api/board-api', () => ({
  boardApi: { getInvitation: mocks.getInvitation },
}));

import { BoardJoinCodePage } from './BoardJoinCodePage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BoardJoinCodePage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

it('영문과 숫자만 6자리까지 대문자로 입력한다', async () => {
  const user = userEvent.setup();
  renderPage();

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
  renderPage();

  await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

  expect(mocks.pop).toHaveBeenCalledOnce();
});

it('유효한 코드를 조회하고 참여 확인 화면으로 이동한다', async () => {
  const user = userEvent.setup();
  mocks.getInvitation.mockResolvedValue(boardInvitationFixture);
  renderPage();

  await user.type(screen.getByRole('textbox', { name: '초대 코드' }), 'k7p2qx');
  await user.click(screen.getByRole('button', { name: '다음' }));

  expect(mocks.getInvitation).toHaveBeenCalledWith('K7P2QX');
  expect(mocks.push).toHaveBeenCalledWith('BoardJoinConfirm', { code: 'K7P2QX' });
});

it('조회 중 코드를 변경하면 이전 응답이 확인 화면을 열지 않는다', async () => {
  const user = userEvent.setup();
  let resolveFirst!: (value: typeof boardInvitationFixture) => void;
  let resolveSecond!: (value: typeof boardInvitationFixture) => void;
  mocks.getInvitation.mockImplementation(
    (code: string) =>
      new Promise((resolve) => {
        if (code === 'AAAAAA') resolveFirst = resolve;
        else resolveSecond = resolve;
      }),
  );
  renderPage();

  const input = screen.getByRole('textbox', { name: '초대 코드' });
  await user.type(input, 'AAAAAA');
  await user.click(screen.getByRole('button', { name: '다음' }));
  await user.clear(input);
  await user.type(input, 'BBBBBB');
  await user.click(screen.getByRole('button', { name: '다음' }));

  await act(async () => resolveSecond(boardInvitationFixture));
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith('BoardJoinConfirm', { code: 'BBBBBB' }),
  );

  await act(async () => resolveFirst(boardInvitationFixture));
  expect(mocks.push).toHaveBeenCalledTimes(1);
});

it('조회 중 뒤로 이동하면 늦은 응답이 확인 화면을 다시 열지 않는다', async () => {
  const user = userEvent.setup();
  let resolveInvitation!: (value: typeof boardInvitationFixture) => void;
  mocks.getInvitation.mockReturnValue(
    new Promise((resolve) => {
      resolveInvitation = resolve;
    }),
  );
  renderPage();

  await user.type(screen.getByRole('textbox', { name: '초대 코드' }), 'K7P2QX');
  await user.click(screen.getByRole('button', { name: '다음' }));
  await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
  await act(async () => resolveInvitation(boardInvitationFixture));

  expect(mocks.pop).toHaveBeenCalledOnce();
  expect(mocks.push).not.toHaveBeenCalled();
});

it('존재하지 않는 코드면 안내 토스트를 보여주고 다음 화면으로 넘어가지 않는다', async () => {
  const user = userEvent.setup();
  mocks.getInvitation.mockRejectedValue(new HttpError(404, 'BOARD-006', null));
  renderPage();

  await user.type(screen.getByRole('textbox', { name: '초대 코드' }), 'k7p2qx');
  await user.click(screen.getByRole('button', { name: '다음' }));

  expect(await screen.findByRole('status')).toHaveTextContent('유효하지 않은 초대 코드예요');
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
});

it('조회 중 오류가 나면 안내 토스트를 보여주고 다음 화면으로 넘어가지 않는다', async () => {
  const user = userEvent.setup();
  mocks.getInvitation.mockRejectedValue(new HttpError(500, 'COMMON-000', null));
  renderPage();

  await user.type(screen.getByRole('textbox', { name: '초대 코드' }), 'k7p2qx');
  await user.click(screen.getByRole('button', { name: '다음' }));

  // 404가 아닌 오류는 shouldRetryBoardQuery가 재시도하므로 백오프 지연을 감안해 넉넉히 기다림
  expect(await screen.findByRole('status', undefined, { timeout: 8000 })).toHaveTextContent(
    '초대 정보를 불러오지 못했어요',
  );
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
}, 10000);
