'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/cn';

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 flex h-14 items-center lg:h-20',
        'justify-between px-6 py-5 transition-colors duration-200 lg:px-12',
        isScrolled && 'bg-black/20 backdrop-blur-[10px]',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG, 최적화 불필요 */}
      <img src="/logo/Logo.svg" alt="PPOTTO" className="h-7 w-auto lg:h-10" />
      <a
        href="#download"
        className={cn(
          'rounded-full bg-[rgba(225,225,225,0.15)] px-3 py-1.5 font-semibold text-[14px] text-white',
          'tracking-[-0.03em] leading-5 lg:text-[16px] lg:leading-6',
        )}
      >
        다운로드
      </a>
    </nav>
  );
}
