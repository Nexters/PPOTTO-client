import { Skeleton } from '@/shared/ui/Skeleton';

export function RecapSummarySkeleton() {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="text-caption-01 text-center text-gray-400 whitespace-nowrap">
        한 줄 요약
      </span>
      <div className="flex w-full flex-col items-center gap-1.5">
        <Skeleton className="h-4 w-64 rounded-4" />
        <Skeleton className="h-4 w-56 rounded-4" />
        <Skeleton className="h-4 w-40 rounded-4" />
      </div>
    </div>
  );
}
