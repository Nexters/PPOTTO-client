import { cn } from '@/shared/lib/cn';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 backdrop-blur-[30px]"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative flex flex-col gap-5 rounded-t-3xl bg-gray-900 pt-4',
          'pr-6 pb-10 pl-6',
        )}
      >
        <div className="mx-auto h-1 w-14 shrink-0 rounded-full bg-gray-700" />
        {children}
      </div>
    </div>
  );
}
