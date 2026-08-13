import { Check, ChevronLeft } from '@ppotto/assets';

export type ShareOptionKey = 'image' | 'summary' | 'themeAnalysis' | 'themePhotos';

const shareOptionLabels: Record<ShareOptionKey, string> = {
  image: '이미지 포함',
  summary: '한 줄 요약 포함',
  themeAnalysis: '테마 분석 포함',
  themePhotos: '테마 속 사진 포함',
};

type RecapShareOptionsProps = {
  options: Record<ShareOptionKey, boolean>;
  onBack: () => void;
  onToggle: (key: ShareOptionKey) => void;
};

export function RecapShareOptions({ options, onBack, onToggle }: RecapShareOptionsProps) {
  return (
    <>
      <div className="flex w-full items-center gap-2">
        <button type="button" onClick={onBack}>
          <ChevronLeft color="white" />
        </button>
        <span className="text-body-01 text-white">공유 옵션</span>
      </div>
      <div className="flex w-full flex-col gap-4">
        {(Object.keys(shareOptionLabels) as ShareOptionKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => onToggle(key)}
          >
            <span className="text-body-04 font-medium text-white">{shareOptionLabels[key]}</span>
            <Check color={options[key] ? 'white' : '#484848'} />
          </button>
        ))}
      </div>
    </>
  );
}
