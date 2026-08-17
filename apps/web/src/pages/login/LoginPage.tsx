'use client';

import { AppleLogo, KakaoLogo, Logo } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';

import { bridge } from '@/shared/lib/bridge';
import { cn } from '@/shared/lib/cn';

export function LoginPage() {
  const { replace } = useFlow();

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

  return (
    <main className="flex min-h-dvh flex-col items-center px-7.5 pt-52.5 pb-14">
      <Logo width={261} height={80} />

      <div className="flex flex-col w-full gap-4 mt-auto">
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

        <button
          type="button"
          onClick={() => login('KAKAO_LOGIN')}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2',
            'rounded-full bg-[#FEE500] px-7 py-3 text-body-03 text-[#29303A]',
          )}
        >
          <KakaoLogo />
          <span className="flex-1 text-center">카카오로 로그인</span>
        </button>
      </div>
    </main>
  );
}
