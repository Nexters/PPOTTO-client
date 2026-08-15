import { Skeleton } from '@/shared/ui/Skeleton';

export function RecapStickerVisualSkeleton() {
  return (
    <div className="relative flex h-52 w-full items-center justify-center">
      <Skeleton className="h-44 w-44 rounded-24" />
    </div>
  );
}
