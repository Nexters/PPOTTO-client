type RecapSummaryProps = {
  content: string;
};

export function RecapSummary({ content }: RecapSummaryProps) {
  return (
    <div className="flex w-full flex-col items-center">
      <span className="text-caption-01 text-center text-gray-400 whitespace-nowrap">
        한 줄 요약
      </span>
      <p className="text-subtitle-01 text-balance break-keep text-center text-gray-50">{content}</p>
    </div>
  );
}
