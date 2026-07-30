import { AnalysisPill } from '@/shared/ui/AnalysisPill';

type RecapThemeTagsProps = {
  tags: string[];
};

export function RecapThemeTags({ tags }: RecapThemeTagsProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="text-body-06 text-gray-400">테마 분석</span>
      <div className="flex flex-wrap justify-center gap-2">
        {tags.map((tag) => (
          <AnalysisPill key={tag} content={tag} />
        ))}
      </div>
    </div>
  );
}
