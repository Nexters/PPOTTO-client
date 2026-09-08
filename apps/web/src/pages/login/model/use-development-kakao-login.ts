import { useFlow } from '@stackflow/react';
import { useEffect, useState } from 'react';

import { completeKakaoLogin } from '@/shared/api/browser-dev-session';
import { track } from '@/shared/lib/bridge';
import { authorizeWithKakao } from '@/shared/lib/kakao';

const REDIRECT_PATH = '/login';

// 인가 요청과 code 교환에 같은 값을 보내야 카카오가 code를 받아준다.
const redirectUri = () => `${window.location.origin}${REDIRECT_PATH}`;

const readAuthorizationCode = () =>
  typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('code');

// 개발 브라우저의 카카오 로그인 왕복. start()로 인가 페이지에 보내고, /login?code=... 로 돌아오면 이어받는다.
export function useDevelopmentKakaoLogin(enabled: boolean) {
  const { replace } = useFlow();
  // 화면 전환 중 URL이 먼저 바뀌어도 영향 없게 마운트 시점 값으로 고정
  const [authorizationCode] = useState(readAuthorizationCode);

  useEffect(() => {
    if (!enabled || !authorizationCode) return;
    // code는 1회용이라 URL에서 바로 지운다
    window.history.replaceState(null, '', window.location.pathname);
    track('login_started', { method: 'development' });
    completeKakaoLogin(authorizationCode, redirectUri())
      .then(() => {
        track('login', { method: 'development' });
        replace('Board', {});
      })
      .catch((error: unknown) => {
        track('login_failed', { method: 'development' });
        console.error('로그인 실패', error);
      });
  }, [authorizationCode, enabled, replace]);

  const start = () => {
    try {
      authorizeWithKakao(redirectUri());
    } catch (error) {
      console.error('로그인 실패', error);
    }
  };

  return { start };
}
