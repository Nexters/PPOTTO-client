'use client';

import { ChevronLeft, Logo } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';

import { useBoardListQuery } from '@/entities/board/api/board-queries';
import { useMeQuery } from '@/entities/user/api/user-queries';
import { bridge } from '@/shared/lib/bridge';
import { hasCompletedFirstUpload } from '@/shared/lib/first-upload-storage';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/common/Button';

import { useOnboardingCarousel } from './model/use-onboarding-carousel';
import { OnboardingIndicator } from './ui/OnboardingIndicator';
import { ONBOARDING_SLIDES } from './ui/OnboardingSlides';

export function OnboardingPage() {
  const { pop } = useFlow();
  const { data: boards } = useBoardListQuery();
  const boardId = boards?.[0]?.id;
  const { data: me } = useMeQuery();
  const { emblaRef, selectedIndex, isLastSlide, goNext } = useOnboardingCarousel(
    ONBOARDING_SLIDES.length,
  );

  const handlePrimaryAction = () => {
    if (isLastSlide) {
      // 업로드 이력이 있으면(스티커를 전부 지우고 온보딩을 다시 본 경우) 추가 업로드로 연다
      const mode = me && hasCompletedFirstUpload(me.id) ? 'additional' : 'initial';
      if (boardId) bridge.send('OPEN_PHOTO_SELECT', { boardId, mode });
      return;
    }
    goNext();
  };

  return (
    <main
      className={cn('mx-auto flex h-dvh w-full max-w-107.5 flex-col', 'overflow-hidden text-white')}
      style={{
        backgroundColor: '#000',
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <header
        className={cn('relative z-10 flex items-center justify-center', 'h-18 shrink-0 px-6')}
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 -bottom-10',
            'bg-linear-to-b from-black to-transparent',
          )}
        />
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={() => pop()}
          className="absolute left-6 z-10"
        >
          <ChevronLeft />
        </button>
        <div className="relative z-10">
          <Logo width={105} height={32} />
        </div>
        <span className="relative z-10 size-6" aria-hidden />
      </header>

      <div className="flex flex-col justify-center flex-1 min-h-0">
        <div ref={emblaRef} className="overflow-hidden shrink-0">
          <div className="flex touch-pan-y">
            {ONBOARDING_SLIDES.map((slide, index) => (
              <section
                key={slide.title}
                data-testid={`onboarding-slide-${index + 1}`}
                className="flex min-w-0 flex-[0_0_100%] flex-col"
              >
                <div className="relative aspect-[460/385] w-full">{slide.illustration}</div>
                <p className="px-6 pt-8 text-center whitespace-pre-line text-subtitle-01 shrink-0">
                  {slide.title}
                </p>
              </section>
            ))}
          </div>
        </div>

        <OnboardingIndicator currentIndex={selectedIndex} className="pt-6 mx-auto shrink-0" />
      </div>

      <footer className="px-6 pt-10 text-black shrink-0">
        <Button onClick={handlePrimaryAction}>
          {isLastSlide ? '사진 업로드 하러가기' : '다음'}
        </Button>
      </footer>
    </main>
  );
}
