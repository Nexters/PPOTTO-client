import { HttpError } from '@ppotto/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/ui/common/Toast';

const { deleteBoard } = vi.hoisted(() => ({ deleteBoard: vi.fn() }));
vi.mock('@/entities/board/api/board-api', () => ({ boardApi: { delete: deleteBoard } }));

import { useDeleteBoard } from './use-delete-board';

const board = { id: 'board-1', name: '제주 여행', participantCount: 1, analysisStatus: null };

const setup = (onDeleted = vi.fn()) => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return { onDeleted, ...renderHook(() => useDeleteBoard({ onDeleted }), { wrapper }) };
};

beforeEach(() => {
  deleteBoard.mockReset();
});

it('분석 중인 보드는 확인 모달을 열지 않고 바로 안내한다', () => {
  const { result } = setup();
  act(() => result.current.request({ ...board, analysisStatus: 'ANALYZING' }));
  expect(result.current.target).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('분석이 진행 중인 보드는 삭제할 수 없어요');
});

it('확인하면 삭제하고 완료 후 콜백을 호출한다', async () => {
  deleteBoard.mockResolvedValue(undefined);
  const { result, onDeleted } = setup();
  act(() => result.current.request(board));
  expect(result.current.target).toEqual(board);
  act(() => result.current.confirm());
  await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
  expect(deleteBoard).toHaveBeenCalledWith('board-1');
  expect(result.current.target).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('보드를 삭제했어요');
});

it('서버가 마지막 보드라 거절하면 사유를 안내하고 이동하지 않는다', async () => {
  deleteBoard.mockRejectedValue(new HttpError(409, 'BOARD-004', null));
  const { result, onDeleted } = setup();
  act(() => result.current.request(board));
  act(() => result.current.confirm());
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('보드가 하나뿐이라 삭제할 수 없어요'),
  );
  expect(onDeleted).not.toHaveBeenCalled();
  expect(result.current.target).toBeNull();
});
