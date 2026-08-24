import Script from 'next/script';
import { useRef, useState } from 'react';

import type { StickerRecap } from '@/entities/sticker/api/sticker-api';
import { useMeQuery } from '@/entities/user/api/user-queries';
import { saveImageToDevice } from '@/features/save-image-to-device';
import { blobToBase64 } from '@/shared/lib/blob-to-base64';
import { bridge } from '@/shared/lib/bridge';
import { canvasToBlob } from '@/shared/lib/canvas-to-blob';
import { captureElementAsBlob, captureElementAsCanvas } from '@/shared/lib/capture-element-as-blob';
import { cropCanvasToSquare } from '@/shared/lib/crop-canvas-to-square';
import { initKakao } from '@/shared/lib/kakao';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { useToast } from '@/shared/ui/common/Toast';

import { buildRecapShareLink } from '../model/build-recap-share-link';

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
  const { data: me } = useMeQuery();
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
  const [isSharingKakao, setIsSharingKakao] = useState(false);
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
      const base64 = await blobToBase64(blob);
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

  const handleKakaoShare = async () => {
    if (!cardRef.current || !window.Kakao || isSharingKakao) return;
    setIsSharingKakao(true);
    try {
      const canvas = await captureElementAsCanvas(cardRef.current, {
        skipFonts: true,
        pixelRatio: 3,
      });
      const cropped = cropCanvasToSquare(canvas);
      const blob = await canvasToBlob(cropped);
      const file = new File([blob], 'ppotto-recap.png', { type: blob.type || 'image/png' });
      const { infos } = await window.Kakao.Share.uploadImage({ file: [file] });

      const tags = data.comments
        .filter((comment) => comment.posX == null)
        .map((comment) => comment.content);
      const webLink = await buildRecapShareLink(stickerId, options);

      const { success } = await bridge.request('SHARE_KAKAO', {
        templateArgs: {
          IMAGE_URL: infos.original.url,
          USER_NAME: me?.name ?? '',
          STICKER_NAME: data.sticker.title,
          KEYWORDS: tags.join(', '),
          WEB_LINK: webLink,
        },
      });
      if (success) handleClose();
      else toast('카카오톡 공유에 실패했습니다');
    } catch (error) {
      console.error('카카오톡 공유 실패', error);
      toast('카카오톡 공유에 실패했습니다');
    } finally {
      setIsSharingKakao(false);
    }
  };

  const isCapturing = isSaving || isSharingInstagram || isSharingKakao;

  return (
    <>
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        onLoad={initKakao}
      />
      <BottomSheet isOpen={isOpen} onClose={handleClose} overlayClassName="bg-black/50">
        {screen === 'list' ? (
          <RecapShareList
            isSaving={isSaving}
            isSharingInstagram={isSharingInstagram}
            isSharingKakao={isSharingKakao}
            onSaveImage={() => void handleSaveImage()}
            onInstagramShare={() => void handleInstagramShare()}
            onKakaoShare={() => void handleKakaoShare()}
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
