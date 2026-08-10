'use client';

import { ChevronLeft, Logo } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useEffect } from 'react';

import { useBoardListQuery } from '@/entities/board/api/board-queries';
import { useMeQuery } from '@/entities/user/api/user-queries';
import { bridge } from '@/shared/lib/bridge';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/common/Button';

import { useOnboardingCarousel } from './model/use-onboarding-carousel';
import { OnboardingIndicator } from './ui/OnboardingIndicator';
import { ONBOARDING_SLIDES } from './ui/OnboardingSlides';

export function OnboardingPage() {
  const { data: boards } = useBoardListQuery();
  const boardId = boards?.[0]?.id;
  const { data: me } = useMeQuery();
  const { pop } = useFlow();
  const { emblaRef, selectedIndex, isLastSlide, goNext, goPrevious } = useOnboardingCarousel(
    ONBOARDING_SLIDES.length,
  );

  useEffect(() => {
    if (me) localStorage.setItem(`ppotto:onboarding-seen:${me.id}`, '1');
  }, [me]);

  const handleBack = () => {
    if (selectedIndex === 0) {
      pop();
      return;
    }
    goPrevious();
  };

  const handlePrimaryAction = () => {
    if (isLastSlide) {
      if (boardId) bridge.send('OPEN_PHOTO_SELECT', { boardId });
      return;
    }
    goNext();
  };

  return (
    <main
      className={cn('mx-auto flex h-dvh w-full max-w-107.5 flex-col', 'overflow-hidden text-white')}
    >
      <header className="flex items-center justify-between px-6 h-18 shrink-0">
        <button
          type="button"
          aria-label="이전으로"
          onClick={handleBack}
          className="flex items-center justify-center size-6"
        >
          <ChevronLeft width={24} height={24} />
        </button>
        <Logo width={105} height={32} />
        <span className="size-6" aria-hidden />
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

      <footer className="px-6 pt-10 text-black shrink-0 pb-11">
        <Button onClick={handlePrimaryAction}>
          {isLastSlide ? '사진 업로드 하러가기' : '다음'}
        </Button>
      </footer>
    </main>
  );
}
