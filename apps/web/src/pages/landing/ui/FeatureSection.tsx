'use client';

import { cn } from '@/shared/lib/cn';

import { useScrollReveal } from './useScrollReveal';

type Feature = {
  label: string;
  title: readonly [string, string];
  image: string;
  imageFirst: boolean;
};

export function FeatureSection({ feature }: { feature: Feature }) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center gap-10 px-6 pt-20',
        'lg:h-[720px] lg:gap-20 lg:pt-24',
        feature.imageFirst ? 'lg:flex-row-reverse' : 'lg:flex-row',
        'transition-all duration-[2400ms] ease-out',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-2 text-center lg:items-start lg:gap-[17px]',
          'lg:text-left',
        )}
      >
        <p
          className={cn(
            'font-semibold text-[18px] text-gray-500 leading-6 tracking-[-0.03em] lg:font-bold lg:text-[24px]',
            'lg:leading-9',
          )}
        >
          {feature.label}
        </p>
        <h2 className="font-bold text-[24px] leading-9 tracking-[-0.03em] lg:text-[36px] lg:leading-[48px]">
          {feature.title[0]}
          <br />
          {feature.title[1]}
        </h2>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 랜딩 애셋, next/image 최적화 비활성 상태라 불필요 */}
      <img src={feature.image} alt="" className="w-[277px] shrink-0 lg:w-[347px]" />
    </section>
  );
}
