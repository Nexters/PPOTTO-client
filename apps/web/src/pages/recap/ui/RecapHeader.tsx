import { ChevronLeft, Share } from '@ppotto/assets';

type RecapHeaderProps = {
  title: string;
  onBack: () => void;
  onShare: () => void;
};

export function RecapHeader({ title, onBack, onShare }: RecapHeaderProps) {
  return (
    <div
      className="flex w-full items-center justify-between pb-3"
      style={{
        paddingTop: 'calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 0.75rem)',
      }}
    >
      <button type="button" onClick={onBack}>
        <ChevronLeft />
      </button>
      <span className="text-body-01 text-center text-gray-50">{title}</span>
      <button type="button" onClick={onShare}>
        <Share color="#FAFAFA" />
      </button>
    </div>
  );
}
