import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

import type { BoardSummary, BoardSummaryList } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

const mocks = vi.hoisted(() => ({ listSummaries: vi.fn() }));

vi.mock('@/entities/board/api/board-api', () => ({
  boardApi: { listSummaries: mocks.listSummaries },
}));
vi.mock('@/entities/terms/api/terms-api', () => ({
  termsApi: { list: vi.fn(() => Promise.resolve([])) },
}));
vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ push: vi.fn(), replace: vi.fn() }),
  useActivity: () => ({ isActive: true }),
}));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { send: vi.fn() } }));
// next/image 전용 boolean prop은 DOM에 그대로 넘기면 경고가 나 제외
vi.mock('next/image', () => ({
  default: ({ fill: _fill, ...props }: React.ComponentProps<'img'> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- next/image 대체 mock이라 규칙 대상 아님
    <img {...props} />
  ),
}));

import { HomePage } from './HomePage';

const fakeBoard = (overrides: Partial<BoardSummary>): BoardSummary => ({
  id: 'board',
  name: '보드',
  kind: 'PERSONAL',
  role: 'OWNER',
  stickerCount: 0,
  participantCount: 1,
  previewImageUrls: [],
  mainColor: null,
  lastActivityAt: '2026-10-25T12:00:00Z',
  analysisStatus: null,
  ...overrides,
});

const fakeList = (boards: BoardSummary[]): BoardSummaryList => ({
  counts: {
    all: boards.length,
    personal: boards.filter((board) => board.kind === 'PERSONAL').length,
    shared: boards.filter((board) => board.kind === 'SHARED').length,
  },
  boards,
});

function renderHomePage(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  );
  return client;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('방장인 보드에만 보드 메뉴 버튼을 보여준다', async () => {
  mocks.listSummaries.mockResolvedValue(
    fakeList([
      fakeBoard({ id: 'mine', name: '내 보드', role: 'OWNER' }),
      fakeBoard({ id: 'joined', name: '참여 보드', kind: 'SHARED', role: 'MEMBER' }),
    ]),
  );
  renderHomePage();

  expect(await screen.findByRole('button', { name: '내 보드 보드 메뉴' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '참여 보드 보드 메뉴' })).not.toBeInTheDocument();
});

it('처음 불러오기에 실패하면 다시 시도 버튼을 보여준다', async () => {
  mocks.listSummaries.mockRejectedValue(new Error('offline'));
  renderHomePage();

  expect(await screen.findByText('보드를 불러오지 못했어요')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
});

it('이미 불러온 목록이 있으면 재조회에 실패해도 목록을 그대로 보여준다', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(
    boardQueryKeys.summaryList(),
    fakeList([fakeBoard({ id: 'cached', name: '캐시 보드' })]),
  );
  mocks.listSummaries.mockRejectedValue(new Error('offline'));
  renderHomePage(client);

  await waitFor(() =>
    expect(client.getQueryState(boardQueryKeys.summaryList())?.status).toBe('error'),
  );
  expect(screen.getByRole('button', { name: '캐시 보드 보드 메뉴' })).toBeInTheDocument();
  expect(screen.queryByText('보드를 불러오지 못했어요')).not.toBeInTheDocument();
});

it('선택한 탭에 보드가 없으면 빈 상태 문구를 보여준다', async () => {
  const user = userEvent.setup();
  mocks.listSummaries.mockResolvedValue(fakeList([fakeBoard({ id: 'mine', name: '내 보드' })]));
  renderHomePage();
  await screen.findByRole('button', { name: '내 보드 보드 메뉴' });
  expect(screen.queryByText('아직 보드가 없어요')).not.toBeInTheDocument();

  await user.click(screen.getByRole('tab', { name: '공유 보드 0' }));

  expect(screen.getByRole('tab', { name: '공유 보드 0' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('아직 보드가 없어요')).toBeInTheDocument();
});
