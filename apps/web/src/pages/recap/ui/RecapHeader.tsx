import { ChevronLeft, Share } from '@ppotto/assets';

type RecapHeaderProps = {
  title: string;
  onBack: () => void;
  onShare: () => void;
};

export function RecapHeader({ title, onBack, onShare }: RecapHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between py-3">
      <button type="button" onClick={onBack}>
        <ChevronLeft />
      </button>
      <span className="text-body-01 text-gray-50">{title}</span>
      <button type="button" onClick={onShare}>
        <Share className="text-gray-50" />
      </button>
    </div>
  );
}
