'use client';

import Script, { type ScriptProps } from 'next/script';

import { initKakao } from '@/shared/lib/kakao';

type KakaoSdkScriptProps = {
  strategy?: ScriptProps['strategy'];
};

export function KakaoSdkScript({ strategy = 'afterInteractive' }: KakaoSdkScriptProps) {
  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js"
      strategy={strategy}
      crossOrigin="anonymous"
      onLoad={initKakao}
    />
  );
}
