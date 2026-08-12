import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import { RecapShareList } from './RecapShareList';
import { RecapShareOptions, type ShareOptionKey } from './RecapShareOptions';

type RecapShareSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function RecapShareSheet({ isOpen, onClose }: RecapShareSheetProps) {
  const [screen, setScreen] = useState<'list' | 'options'>('list');
  const [options, setOptions] = useState<Record<ShareOptionKey, boolean>>({
    image: true,
    summary: true,
    themeAnalysis: true,
    themePhotos: true,
  });

  const handleClose = () => {
    onClose();
    setScreen('list');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} overlayClassName="bg-black/50">
      {screen === 'list' ? (
        <RecapShareList onOptionsClick={() => setScreen('options')} />
      ) : (
        <RecapShareOptions
          options={options}
          onBack={() => setScreen('list')}
          onToggle={(key) => setOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
        />
      )}
    </BottomSheet>
  );
}
