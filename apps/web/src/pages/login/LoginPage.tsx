'use client';

import { AppleLogo, KakaoLogo, Logo } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import Script from 'next/script';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  completeKakaoLogin,
  isDevelopmentBrowser,
  startKakaoLogin,
} from '@/shared/api/browser-dev-session';
import { bridge, track } from '@/shared/lib/bridge';
import { cn } from '@/shared/lib/cn';
import { initKakao } from '@/shared/lib/kakao';

const subscribeToBrowserEnvironment = () => () => undefined;

export function LoginPage() {
  const { replace } = useFlow();
  const isDevelopment = useSyncExternalStore(
    subscribeToBrowserEnvironment,
    isDevelopmentBrowser,
    () => false,
  );
  // 화면 전환 중 URL이 먼저 바뀌어도 영향 없게 마운트 시점 값으로 고정
  const [isAndroid] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('nativePlatform') === 'android',
  );
  const [authorizationCode] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('code'),
  );

  // 카카오 인가 페이지에서 code를 들고 돌아온 경우. code는 1회용이라 URL에서 바로 지운다.
  useEffect(() => {
    if (!isDevelopment || !authorizationCode) return;
    window.history.replaceState(null, '', window.location.pathname);
    track('login_started', { method: 'development' });
    completeKakaoLogin(authorizationCode)
      .then(() => {
        track('login', { method: 'development' });
        replace('Board', {});
      })
      .catch((error: unknown) => {
        track('login_failed', { method: 'development' });
        console.error('로그인 실패', error);
      });
  }, [authorizationCode, isDevelopment, replace]);

  const login = async (channel: 'APPLE_LOGIN' | 'KAKAO_LOGIN') => {
    try {
      const result = await bridge.request(channel, undefined, { timeout: 'none' });
      if (!result) return;
      // 약관 미동의 여부는 보드 진입 시 useTermsGate가 GET /terms로 판단한다
      replace('Board', {});
    } catch (error) {
      console.error('로그인 실패', error);
    }
  };

  const loginWithKakao = () => {
    if (!isDevelopment) return void login('KAKAO_LOGIN');
    try {
      startKakaoLogin();
    } catch (error) {
      console.error('로그인 실패', error);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center px-7.5 pt-52.5 pb-14">
      {isDevelopment && (
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          onLoad={initKakao}
        />
      )}

      <Logo width={261} height={80} />

      <div className="flex flex-col w-full gap-4 mt-auto">
        {!isAndroid && !isDevelopment && (
          <button
            type="button"
            onClick={() => login('APPLE_LOGIN')}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2',
              'rounded-full bg-white px-7 py-3 text-body-03 text-black',
            )}
          >
            <AppleLogo />
            <span className="flex-1 text-center">Apple로 로그인</span>
          </button>
        )}

        <button
          type="button"
          onClick={loginWithKakao}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2',
            'rounded-full bg-[#FEE500] px-7 py-3 text-body-03 text-black',
          )}
        >
          <KakaoLogo />
          <span className="flex-1 text-center">카카오로 로그인</span>
        </button>
      </div>
    </main>
  );
}
