import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, completeKakaoLogin, authorizeWithKakao, track } = vi.hoisted(() => ({
  replace: vi.fn(),
  completeKakaoLogin: vi.fn(),
  authorizeWithKakao: vi.fn(),
  track: vi.fn(),
}));
vi.mock('@stackflow/react', () => ({ useFlow: () => ({ replace }) }));
vi.mock('@/shared/api/browser-dev-session', () => ({ completeKakaoLogin }));
vi.mock('@/shared/lib/bridge', () => ({ track }));
vi.mock('@/shared/lib/kakao', () => ({ authorizeWithKakao }));

import { useDevelopmentKakaoLogin } from './use-development-kakao-login';

const REDIRECT_URI = 'http://localhost:3000/login';

describe('useDevelopmentKakaoLogin', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/login');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('start는 /login을 redirect URI로 카카오 인가를 시작한다', () => {
    const { result } = renderHook(() => useDevelopmentKakaoLogin(true));

    result.current.start();

    expect(authorizeWithKakao).toHaveBeenCalledWith(REDIRECT_URI);
  });

  it('URL에 code가 없으면 아무것도 하지 않는다', () => {
    renderHook(() => useDevelopmentKakaoLogin(true));

    expect(completeKakaoLogin).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it('돌아온 code를 URL에서 지우고 같은 redirect URI로 교환한 뒤 보드로 이동한다', async () => {
    completeKakaoLogin.mockResolvedValueOnce(undefined);
    window.history.replaceState(null, '', '/login?code=kakao-code');

    renderHook(() => useDevelopmentKakaoLogin(true));

    expect(window.location.search).toBe('');
    expect(completeKakaoLogin).toHaveBeenCalledWith('kakao-code', REDIRECT_URI);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('Board', {}));
    expect(track).toHaveBeenCalledWith('login', { method: 'development' });
  });

  it('code 교환에 실패하면 실패를 기록하고 이동하지 않는다', async () => {
    completeKakaoLogin.mockRejectedValueOnce(new Error('AUTH-008'));
    window.history.replaceState(null, '', '/login?code=expired-code');

    renderHook(() => useDevelopmentKakaoLogin(true));

    await waitFor(() =>
      expect(track).toHaveBeenCalledWith('login_failed', { method: 'development' }),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('개발 브라우저가 아니면 code가 있어도 건드리지 않는다', () => {
    window.history.replaceState(null, '', '/login?code=kakao-code');

    renderHook(() => useDevelopmentKakaoLogin(false));

    expect(completeKakaoLogin).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?code=kakao-code');
  });
});
