import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  agree: vi.fn(),
  push: vi.fn(),
  pop: vi.fn(),
  replace: vi.fn(),
  isRoot: false,
}));

vi.mock('@/entities/terms/api/terms-api', () => ({
  termsApi: { list: mocks.list, agree: mocks.agree },
}));
vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ push: mocks.push, pop: mocks.pop, replace: mocks.replace }),
  useActivity: () => ({ isRoot: mocks.isRoot }),
}));
vi.mock('@/shared/lib/bridge', () => ({ track: vi.fn() }));

import { TermsPage } from './TermsPage';

const PENDING_TERMS = [
  { id: 'tos', code: 'TOS', version: '1', isRequired: true, agreed: false },
  { id: 'privacy', code: 'PRIVACY', version: '1', isRequired: true, agreed: false },
];

function renderTermsPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TermsPage />
    </QueryClientProvider>,
  );
}

async function agreeAll() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: '약관 전체동의' }));
  await user.click(screen.getByRole('button', { name: '동의하고 계속하기' }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.isRoot = false;
});

it('홈 위에 열린 약관 화면은 동의하면 닫혀 아래의 홈으로 돌아간다', async () => {
  mocks.isRoot = false;
  mocks.list.mockResolvedValue(PENDING_TERMS);
  mocks.agree.mockResolvedValue(undefined);
  renderTermsPage();

  await agreeAll();

  await vi.waitFor(() => expect(mocks.pop).toHaveBeenCalledTimes(1));
  expect(mocks.replace).not.toHaveBeenCalled();
});

it('루트로 열린 약관 화면은 동의하면 홈으로 교체된다', async () => {
  mocks.isRoot = true;
  mocks.list.mockResolvedValue(PENDING_TERMS);
  mocks.agree.mockResolvedValue(undefined);
  renderTermsPage();

  await agreeAll();

  await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('Home', {}));
  expect(mocks.pop).not.toHaveBeenCalled();
});
