import { ChevronLeft } from '@ppotto/assets';

type PhotoViewerHeaderProps = {
  onBack: () => void;
};

export function PhotoViewerHeader({ onBack }: PhotoViewerHeaderProps) {
  return (
    <div className="flex w-full items-center px-6">
      <button type="button" onClick={onBack}>
        <ChevronLeft />
      </button>
    </div>
  );
}
