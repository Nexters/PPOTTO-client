import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  request: vi.fn(),
  getPostLoginDestination: vi.fn(),
}));

vi.mock('@stackflow/react', () => ({ useFlow: () => ({ replace: mocks.replace }) }));
vi.mock('@ppotto/assets', () => ({
  AppleLogo: () => null,
  KakaoLogo: () => null,
  Logo: () => null,
}));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { request: mocks.request } }));
vi.mock('@/features/board-invitation', () => ({
  getPostLoginDestination: mocks.getPostLoginDestination,
}));
vi.mock('@/shared/lib/runtime-environment', () => ({ isDevelopmentBrowser: () => false }));
vi.mock('@/shared/ui/KakaoSdkScript', () => ({ KakaoSdkScript: () => null }));
vi.mock('./model/use-development-kakao-login', () => ({
  useDevelopmentKakaoLogin: () => ({ start: vi.fn() }),
}));

import { LoginPage } from './LoginPage';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPostLoginDestination.mockResolvedValue({ type: 'HOME' });
});

it('로그인 후 저장된 보드 초대 목적지로 복귀한다', async () => {
  mocks.request.mockResolvedValue({ isNewUser: false, pendingTerms: [] });
  mocks.getPostLoginDestination.mockResolvedValue({
    type: 'BOARD_INVITATION',
    code: 'K7P2QX',
  });
  const user = userEvent.setup();
  render(<LoginPage />);

  await user.click(screen.getByRole('button', { name: '카카오로 로그인' }));

  await waitFor(() =>
    expect(mocks.replace).toHaveBeenCalledWith('BoardInvitationJoin', { code: 'K7P2QX' }),
  );
});

it('필수 약관이 남아 있으면 초대보다 약관 게이트가 있는 홈으로 먼저 이동한다', async () => {
  mocks.request.mockResolvedValue({
    isNewUser: true,
    pendingTerms: [{ id: 'tos', code: 'TOS', version: '1', isRequired: true, agreed: false }],
  });
  const user = userEvent.setup();
  render(<LoginPage />);

  await user.click(screen.getByRole('button', { name: '카카오로 로그인' }));

  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('Home', {}));
  expect(mocks.getPostLoginDestination).not.toHaveBeenCalled();
});
