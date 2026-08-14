'use client';

import { Check, IconEyedropper } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

const PALETTE_COLORS = [
  { label: '화이트', value: '#ffffff', className: 'bg-white' },
  { label: '핑크', value: '#ffaee1', className: 'bg-[#ffaee1]' },
  { label: '옐로우', value: '#fff697', className: 'bg-yellow-200' },
  { label: '그린', value: '#89f797', className: 'bg-green-100' },
  { label: '블루', value: '#99dbff', className: 'bg-blue-200' },
];

type DrawingColorPaletteProps = {
  color: string;
  onColorChange: (color: string) => void;
};

export function DrawingColorPalette({ color, onColorChange }: DrawingColorPaletteProps) {
  return (
    <div className="flex items-center gap-2 px-2 drop-shadow-[0px_6px_10px_rgba(0,0,0,0.12)]">
      {PALETTE_COLORS.map((swatch) => (
        <button
          key={swatch.value}
          type="button"
          aria-label={swatch.label}
          onClick={() => onColorChange(swatch.value)}
          className={cn(
            'relative size-6 shrink-0 rounded-8 border-2 border-white',
            swatch.className,
          )}
        >
          {color === swatch.value && (
            <span className="absolute top-0.5 left-0.5">
              <Check color="#181818" width={16} height={16} />
            </span>
          )}
        </button>
      ))}
      <button
        type="button"
        aria-label="스포이드"
        disabled
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-8',
          'border-2 border-white bg-white disabled:opacity-40',
        )}
      >
        <IconEyedropper color="#181818" width={20} height={20} />
      </button>
    </div>
  );
}
