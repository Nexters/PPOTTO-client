import { Skeleton } from '@/shared/ui/Skeleton';

export function RecapPhotoGridSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full justify-between">
        <span className="text-body-01 text-center whitespace-nowrap text-gray-50">
          테마 속 사진
        </span>
        <Skeleton className="h-5 w-6 rounded-4" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}
