import { ChevronLeft } from '@ppotto/assets';

type PhotoViewerHeaderProps = {
  onBack: () => void;
};

export function PhotoViewerHeader({ onBack }: PhotoViewerHeaderProps) {
  return (
    <div
      className="flex w-full items-center px-6"
      style={{
        paddingTop: 'calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 0.75rem)',
      }}
    >
      <button type="button" onClick={onBack}>
        <ChevronLeft />
      </button>
    </div>
  );
}
