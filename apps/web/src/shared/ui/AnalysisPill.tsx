import { cn } from '@/shared/lib/cn';

type AnalysisPillProps = {
  content: string;
};

export function AnalysisPill({ content }: AnalysisPillProps) {
  return (
    <div
      className={cn(
        'flex h-8 items-start rounded-full px-3 py-1.5',
        'bg-gray-200/15 backdrop-blur-[1.5px]',
      )}
    >
      <span className="text-body-06 text-gray-200">{content}</span>
    </div>
  );
}
