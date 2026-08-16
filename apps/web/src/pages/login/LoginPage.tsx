'use client';

import { AppleLogo, KakaoLogo, Logo } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';

import { bridge } from '@/shared/lib/bridge';
import { cn } from '@/shared/lib/cn';

export function LoginPage() {
  const { replace } = useFlow();

  const login = async (channel: 'APPLE_LOGIN' | 'KAKAO_LOGIN') => {
    try {
      const result = await bridge.request(channel);
      if (!result) return;
      // 약관 미동의 여부는 보드 진입 시 useTermsGate가 GET /terms로 판단한다
      replace('Board', {});
    } catch (error) {
      console.error('로그인 실패', error);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center px-[30px] pt-[210px]">
      <Logo width={261} height={80} />

      <div className="flex flex-col w-full gap-4 mt-auto">
        <button
          type="button"
          onClick={() => login('APPLE_LOGIN')}
          className={cn(
            'flex items-center justify-center w-full h-12 gap-2 text-black',
            'bg-white rounded-full text-body-03',
          )}
        >
          <AppleLogo />
          Apple로 로그인
        </button>

        <button
          type="button"
          onClick={() => login('KAKAO_LOGIN')}
          className={cn(
            'text-body-03 flex h-12 w-full items-center justify-center gap-2',
            'rounded-full bg-[#FEE500] text-[#29303A]',
          )}
        >
          <KakaoLogo />
          카카오로 로그인
        </button>
      </div>
    </main>
  );
}
