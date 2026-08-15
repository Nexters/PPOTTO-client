import { useState } from 'react';

import { saveImageToDevice } from '@/features/save-image-to-device';
import { captureElementAsBlob } from '@/shared/lib/capture-element-as-blob';
import { useToast } from '@/shared/ui/common/Toast';

export function useSaveStickerImage() {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const saveStickerImage = async (element: HTMLElement, onSuccess?: () => void) => {
    setIsSaving(true);
    try {
      const blob = await captureElementAsBlob(element);
      const success = await saveImageToDevice(blob);
      if (success) {
        toast('스티커가 저장되었습니다.');
        onSuccess?.();
      } else {
        toast('스티커 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('스티커 저장 실패', error);
      toast('스티커 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return { saveStickerImage, isSaving };
}
