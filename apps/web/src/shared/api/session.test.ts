import { afterEach, describe, expect, it, vi } from 'vitest';

const { request, hasDevelopmentSession, logoutDevelopmentSession, withdrawDevelopmentSession } =
  vi.hoisted(() => ({
    request: vi.fn(),
    hasDevelopmentSession: vi.fn(),
    logoutDevelopmentSession: vi.fn(),
    withdrawDevelopmentSession: vi.fn(),
  }));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { request } }));
vi.mock('./browser-dev-session', () => ({
  hasDevelopmentSession,
  logoutDevelopmentSession,
  withdrawDevelopmentSession,
}));

import { logout, withdraw } from './session';

describe('session', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('앱 안에서는 로그아웃과 탈퇴를 네이티브에 맡긴다', async () => {
    hasDevelopmentSession.mockReturnValue(false);

    await logout();
    await withdraw();

    expect(request).toHaveBeenNthCalledWith(1, 'LOGOUT');
    expect(request).toHaveBeenNthCalledWith(2, 'WITHDRAW');
    expect(logoutDevelopmentSession).not.toHaveBeenCalled();
    expect(withdrawDevelopmentSession).not.toHaveBeenCalled();
  });

  it('브라우저 세션이면 서버에 직접 끝내고 네이티브를 부르지 않는다', async () => {
    hasDevelopmentSession.mockReturnValue(true);
    logoutDevelopmentSession.mockResolvedValue(undefined);
    withdrawDevelopmentSession.mockResolvedValue(undefined);
    // jsdom은 location.assign 이동을 구현하지 않고 console.error로만 알린다
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await logout();
    await withdraw();

    expect(logoutDevelopmentSession).toHaveBeenCalledOnce();
    expect(withdrawDevelopmentSession).toHaveBeenCalledOnce();
    expect(request).not.toHaveBeenCalled();
  });
});
