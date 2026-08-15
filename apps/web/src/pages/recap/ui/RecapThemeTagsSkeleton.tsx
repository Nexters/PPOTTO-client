import { Skeleton } from '@/shared/ui/Skeleton';

const ROW_WIDTHS = [
  [64, 56, 72, 48],
  [80, 60, 52],
];

export function RecapThemeTagsSkeleton() {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="text-caption-01 text-center text-gray-400 whitespace-nowrap">테마 분석</span>
      <div className="flex w-full flex-col items-center gap-2">
        {ROW_WIDTHS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map((width, index) => (
              <Skeleton key={index} className="h-8 rounded-full" style={{ width }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
