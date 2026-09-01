'use client';

import { cn } from '@/shared/lib/cn';

import { useScrollReveal } from './useScrollReveal';

export function HeroPhoneImage() {
  const { ref, isVisible } = useScrollReveal<HTMLImageElement>();

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 랜딩 애셋, next/image 최적화 비활성 상태라 불필요
    <img
      ref={ref}
      src="/landing/hero-phone.webp"
      alt="뽀또 앱 보드 화면"
      className={cn(
        'w-[360px] max-w-full lg:w-[786px]',
        'transition-all duration-[2000ms] ease-out',
        isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
      )}
    />
  );
}
