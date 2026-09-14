'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { BottomSheet } from '@/shared/ui/BottomSheet';

const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.ppotto.mobile&pcampaignid=web_share';
const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6796674900';
const SHOW_DELAY_MS = 3_000;

function isIOSDevice(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function AppInstallPromptSheet() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleStayInWeb = () => setIsOpen(false);
  const isIOS = isIOSDevice();
  const storeName = isIOS ? '앱스토어' : '플레이스토어';
  const storeUrl = isIOS ? APP_STORE_URL : GOOGLE_PLAY_URL;

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
