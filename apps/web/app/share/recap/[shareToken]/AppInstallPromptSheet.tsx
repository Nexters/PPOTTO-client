'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { APP_SCHEME, APP_STORE_URL, GOOGLE_PLAY_URL } from '@/shared/config/app-links';
import { cn } from '@/shared/lib/cn';
import { openAppWithStoreFallback } from '@/shared/lib/open-app-with-store-fallback';
import { BottomSheet } from '@/shared/ui/BottomSheet';

const APP_SCHEME_URL = `${APP_SCHEME}://`;
const SHOW_DELAY_MS = 3_000;

function isIOSDevice(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// 저장소가 막힌 브라우저(시크릿 모드 등)에서는 매번 띄운다
function wasDismissed(dismissKey: string): boolean {
  try {
    return sessionStorage.getItem(dismissKey) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed(dismissKey: string) {
  try {
    sessionStorage.setItem(dismissKey, '1');
  } catch {
    // 기록하지 못하면 다음 화면에서 다시 띄운다
  }
}

type Platform = 'ios' | 'android';

type AppInstallPromptSheetProps = {
  // 넘기면 한 번 닫은 뒤 같은 탭에서는 다시 띄우지 않는다. 보드 공유처럼 리캡을 여러 번 오가는 화면용
  dismissKey?: string;
};

export function AppInstallPromptSheet({ dismissKey }: AppInstallPromptSheetProps) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const cancelFallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (dismissKey && wasDismissed(dismissKey)) return;
    const timer = setTimeout(() => {
      setPlatform(isIOSDevice() ? 'ios' : 'android');
      setIsOpen(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dismissKey]);

  useEffect(() => {
    return () => cancelFallbackRef.current?.();
  }, []);

  const handleStayInWeb = () => {
    if (dismissKey) rememberDismissed(dismissKey);
    setIsOpen(false);
  };

  if (platform === null) return null;

  const isIOS = platform === 'ios';
  const storeName = isIOS ? '앱스토어' : '플레이스토어';
  const storeUrl = isIOS ? APP_STORE_URL : GOOGLE_PLAY_URL;

  const handleOpenApp = (event: React.MouseEvent) => {
    event.preventDefault();
    cancelFallbackRef.current?.();
    cancelFallbackRef.current = openAppWithStoreFallback(APP_SCHEME_URL);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleStayInWeb}
      title="앱 설치 안내"
      overlayClassName="bg-black/70"
      contentClassName="mx-auto max-w-112.5"
    >
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/logo/ppotto-icon.png"
          alt=""
          width={80}
          height={80}
          className="rounded-[17.14px]"
        />
        <div className="flex w-full flex-col items-center gap-2">
          <p className="text-center text-[18px] leading-6 font-semibold tracking-[-0.03em] text-white">
            뽀또 앱에서 더 많은 기능을 이용해보세요!
          </p>
          <p className="text-center text-sm leading-5 font-medium tracking-[-0.03em] text-gray-500">
            {storeName}에서 다운로드하세요
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          <a
            href={storeUrl}
            onClick={handleOpenApp}
            className={cn(
              'flex h-13 w-full items-center justify-center rounded-2xl',
              'bg-white text-body-03 font-semibold text-black',
            )}
          >
            앱으로 보기
          </a>
          <button
            type="button"
            onClick={handleStayInWeb}
            className={cn(
              'rounded-full px-7 py-2',
              'text-sm leading-5 font-medium tracking-[-0.03em] text-gray-500',
            )}
          >
            모바일 웹에서 볼래요
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
