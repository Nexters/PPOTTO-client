import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  replace: vi.fn(),
  getPostLoginDestination: vi.fn(),
}));

vi.mock('@stackflow/react', () => ({ useFlow: () => ({ replace: mocks.replace }) }));
vi.mock('@/entities/terms/api/terms-api', () => ({ termsApi: { list: mocks.list } }));
vi.mock('@/features/board-invitation', () => ({
  getPostLoginDestination: mocks.getPostLoginDestination,
}));

import { useTermsGate } from './use-terms-gate';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPostLoginDestination.mockResolvedValue({ type: 'HOME' });
});

it('필수 약관이 남아 있으면 초대 목적지보다 약관으로 먼저 이동한다', async () => {
  mocks.list.mockResolvedValue([{ isRequired: true, agreed: false }]);
  mocks.getPostLoginDestination.mockResolvedValue({
    type: 'BOARD_INVITATION',
    code: 'K7P2QX',
  });

  renderHook(useTermsGate);

  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('Terms', {}));
  expect(mocks.getPostLoginDestination).not.toHaveBeenCalled();
});

it('약관 확인이 끝난 자동 로그인 사용자는 저장된 초대 목적지로 이동한다', async () => {
  mocks.list.mockResolvedValue([{ isRequired: true, agreed: true }]);
  mocks.getPostLoginDestination.mockResolvedValue({
    type: 'BOARD_INVITATION',
    code: 'K7P2QX',
  });

  renderHook(useTermsGate);

  await waitFor(() =>
    expect(mocks.replace).toHaveBeenCalledWith('BoardInvitationJoin', { code: 'K7P2QX' }),
  );
});
