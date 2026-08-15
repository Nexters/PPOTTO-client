import { useRef, useState } from 'react';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import { RecapShareCard } from './RecapShareCard';
import { RecapShareList } from './RecapShareList';
import { RecapShareOptions, type ShareOptionKey } from './RecapShareOptions';

type RecapShareSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  stickerId: string;
  data: StickerRecap;
};

export function RecapShareSheet({ isOpen, onClose, stickerId, data }: RecapShareSheetProps) {
  const [screen, setScreen] = useState<'list' | 'options'>('list');
  const [options, setOptions] = useState<Record<ShareOptionKey, boolean>>({
    image: true,
    summary: true,
    themeAnalysis: true,
    themePhotos: true,
  });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    onClose();
    setScreen('list');
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleClose} overlayClassName="bg-black/50">
        {screen === 'list' ? (
          <RecapShareList
            cardRef={cardRef}
            onOptionsClick={() => setScreen('options')}
            onSaved={handleClose}
          />
        ) : (
          <RecapShareOptions
            options={options}
            onBack={() => setScreen('list')}
            onToggle={(key) => setOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
        )}
      </BottomSheet>
      {isOpen && (
        <div className="fixed top-0 left-[-9999px]" aria-hidden>
          <div ref={cardRef}>
            <RecapShareCard stickerId={stickerId} data={data} options={options} />
          </div>
        </div>
      )}
    </>
  );
}
