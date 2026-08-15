import { useRef, useState } from 'react';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { saveImageToDevice } from '@/features/save-image-to-device';
import { blobToBase64 } from '@/shared/lib/blob-to-base64';
import { bridge } from '@/shared/lib/bridge';
import { captureElementAsBlob } from '@/shared/lib/capture-element-as-blob';
import { composeInstagramStoryImage } from '@/shared/lib/compose-instagram-story-image';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { useToast } from '@/shared/ui/common/Toast';

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
  const toast = useToast();
  const [screen, setScreen] = useState<'list' | 'options'>('list');
  const [options, setOptions] = useState<Record<ShareOptionKey, boolean>>({
    image: true,
    summary: true,
    themeAnalysis: true,
    themePhotos: true,
  });
  // 저장/공유 진행 상태는 시트가 닫혀도 살아있는 이 컴포넌트가 든다 —
  // 시트 내용물은 닫힐 때 언마운트되므로, 거기 두면 다시 열었을 때 초기화돼 보인다
  const [isSaving, setIsSaving] = useState(false);
  const [isSharingInstagram, setIsSharingInstagram] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    onClose();
    setScreen('list');
  };

  const handleSaveImage = async () => {
    if (!cardRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const blob = await captureElementAsBlob(cardRef.current, { skipFonts: true, pixelRatio: 3 });
      const success = await saveImageToDevice(blob);
      if (success) {
        toast('이미지가 저장되었습니다');
        handleClose();
      } else {
        toast('이미지 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('이미지 저장 실패', error);
      toast('이미지 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstagramShare = async () => {
    if (!cardRef.current || isSharingInstagram) return;
    setIsSharingInstagram(true);
    try {
      const blob = await captureElementAsBlob(cardRef.current, { skipFonts: true, pixelRatio: 3 });
      // 스토리 배경은 화면 채우기로 스케일되므로 9:16으로 미리 맞춰야 세로가 잘리지 않는다
      const storyBlob = await composeInstagramStoryImage(blob);
      const base64 = await blobToBase64(storyBlob);
      const { success } = await bridge.request('SHARE_INSTAGRAM_STORY', { base64 });
      if (success) handleClose();
      else toast('인스타그램 공유에 실패했습니다');
    } catch (error) {
      console.error('인스타그램 공유 실패', error);
      toast('인스타그램 공유에 실패했습니다');
    } finally {
      setIsSharingInstagram(false);
    }
  };

  const isCapturing = isSaving || isSharingInstagram;

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleClose} overlayClassName="bg-black/50">
        {screen === 'list' ? (
          <RecapShareList
            isSaving={isSaving}
            isSharingInstagram={isSharingInstagram}
            onSaveImage={() => void handleSaveImage()}
            onInstagramShare={() => void handleInstagramShare()}
            onOptionsClick={() => setScreen('options')}
          />
        ) : (
          <RecapShareOptions
            options={options}
            onBack={() => setScreen('list')}
            onToggle={(key) => setOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
        )}
      </BottomSheet>
      {/* 캡처 도중 시트가 닫혀도 캡처 대상 DOM이 언마운트되지 않게 작업 중에는 유지한다 */}
      {(isOpen || isCapturing) && (
        <div className="fixed top-0 left-[-9999px]" aria-hidden>
          <div ref={cardRef}>
            <RecapShareCard stickerId={stickerId} data={data} options={options} />
          </div>
        </div>
      )}
    </>
  );
}
