import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/ui/common/Toast';

const { leaveBoard } = vi.hoisted(() => ({ leaveBoard: vi.fn() }));
vi.mock('@/entities/board/api/board-api', () => ({ boardApi: { leave: leaveBoard } }));

import { useLeaveBoard } from './use-leave-board';

const board = { id: 'board-1', name: '제주 여행' };

const setup = (onLeft = vi.fn()) => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );

  return { onLeft, ...renderHook(() => useLeaveBoard({ onLeft }), { wrapper }) };
};

beforeEach(() => {
  leaveBoard.mockReset();
});

it('나가기를 요청하면 확인 대상을 저장한다', () => {
  const { result } = setup();

  act(() => result.current.request(board));

  expect(result.current.target).toEqual(board);
  expect(result.current.isOpen).toBe(true);
});

it('모달을 닫는 동안 표시할 보드 정보는 유지한다', () => {
  const { result } = setup();
  act(() => result.current.request(board));

  act(() => result.current.cancel());

  expect(result.current.isOpen).toBe(false);
  expect(result.current.target).toEqual(board);
});

it('확인하면 보드에서 나가고 완료 후 홈 이동을 요청한다', async () => {
  leaveBoard.mockResolvedValue(undefined);
  const { result, onLeft } = setup();
  act(() => result.current.request(board));

  act(() => result.current.confirm());

  await waitFor(() => expect(onLeft).toHaveBeenCalledOnce());
  expect(leaveBoard).toHaveBeenCalledWith('board-1');
  expect(result.current.isOpen).toBe(false);
  expect(result.current.target).toEqual(board);
  expect(screen.getByRole('status')).toHaveTextContent("'제주 여행' 보드에서 나갔어요");
});

it('나가기 요청이 실패하면 안내하고 이동하지 않는다', async () => {
  leaveBoard.mockRejectedValue(new Error('network error'));
  const { result, onLeft } = setup();
  act(() => result.current.request(board));

  act(() => result.current.confirm());

  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(
      '보드에서 나가지 못했어요. 다시 시도해 주세요',
    ),
  );
  expect(onLeft).not.toHaveBeenCalled();
  expect(result.current.isOpen).toBe(false);
  expect(result.current.target).toEqual(board);
});
