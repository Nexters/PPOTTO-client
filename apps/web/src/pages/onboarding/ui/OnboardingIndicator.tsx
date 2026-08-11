import { cn } from '@/shared/lib/cn';

const PAGE_COUNT = 4;

type OnboardingIndicatorProps = {
  currentIndex: number;
  className?: string;
};

/** 현재 온보딩 페이지를 네 개의 점으로 표시합니다. */
export function OnboardingIndicator({ currentIndex, className }: OnboardingIndicatorProps) {
  return (
    <div
      role="status"
      aria-label={`${currentIndex + 1} / ${PAGE_COUNT}`}
      className={cn('flex items-center gap-2.5', className)}
    >
      {Array.from({ length: PAGE_COUNT }, (_, index) => (
        <span
          key={index}
          aria-current={index === currentIndex ? 'step' : undefined}
          className={cn(
            'size-1.5 rounded-full',
            index === currentIndex ? 'bg-white' : 'bg-gray-600',
          )}
        />
      ))}
    </div>
  );
}
