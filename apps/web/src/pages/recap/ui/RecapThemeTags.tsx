import { AnalysisPill } from '@/shared/ui/AnalysisPill';

type RecapThemeTagsProps = {
  tags: string[];
};

export function RecapThemeTags({ tags }: RecapThemeTagsProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="text-caption-01 text-center text-gray-400 whitespace-nowrap">테마 분석</span>
      <div className="flex flex-wrap justify-center gap-2">
        {tags.map((tag) => (
          <AnalysisPill key={tag} content={tag} />
        ))}
      </div>
    </div>
  );
}
