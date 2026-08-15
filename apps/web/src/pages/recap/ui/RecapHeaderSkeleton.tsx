import { ChevronLeft } from '@ppotto/assets';

import { Skeleton } from '@/shared/ui/Skeleton';

type RecapHeaderSkeletonProps = {
  onBack: () => void;
};

export function RecapHeaderSkeleton({ onBack }: RecapHeaderSkeletonProps) {
  return (
    <div className="flex w-full items-center justify-between py-3">
      <button type="button" onClick={onBack}>
        <ChevronLeft />
      </button>
      <Skeleton className="h-5 w-24 rounded-4" />
      <div className="size-6" />
    </div>
  );
}
