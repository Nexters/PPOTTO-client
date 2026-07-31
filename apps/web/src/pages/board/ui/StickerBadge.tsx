import { cn } from '@/shared/lib/cn';

type StickerBadgeProps = {
  title: string;
  isNew?: boolean;
};

export function StickerBadge({ title, isNew }: StickerBadgeProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center gap-2',
        'rounded-full bg-white px-3 py-1.5',
      )}
    >
      <p className="text-caption-01 text-nowrap text-gray-900">{title}</p>
      {isNew && (
        <div
          className={cn(
            'absolute top-0 right-0.5 size-2 rounded-full',
            'ring-2 ring-white bg-red-400',
          )}
        />
      )}
    </div>
  );
}
