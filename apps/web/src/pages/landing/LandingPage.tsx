/* eslint-disable @next/next/no-img-element -- 정적 랜딩 애셋, next/image 최적화 비활성 상태라 불필요 */
import { cn } from '@/shared/lib/cn';

import { LandingNav } from './ui/LandingNav';

// ponytail: 구글 플레이 미출시 — 출시 후 실제 스토어 URL로 교체
const GOOGLE_PLAY_URL = '#';
const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6796674900';

const FEATURES = [
  {
    label: '스티커 생성',
    title: ['최근 사진 100장을 올리고', '테마 스티커를 만드세요'],
    image: '/landing/feature-create.webp',
    imageFirst: true,
  },
  {
    label: '포토 리캡',
    title: ['스티커를 누르면', '추억을 돌아볼 수 있어요'],
    image: '/landing/feature-recap.webp',
    imageFirst: false,
  },
  {
    label: '스티커 메뉴',
    title: ['3초간 꾹 눌러서', '스티커를 관리하세요'],
    image: '/landing/feature-menu.webp',
    imageFirst: true,
  },
  {
    label: '보드 꾸미기',
    title: ['스티커 보드를 자유롭게', '꾸미고 자랑하세요'],
    image: '/landing/feature-board.webp',
    imageFirst: false,
  },
] as const;

function StoreButtons() {
  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row">
      <a
        href={GOOGLE_PLAY_URL}
        className={cn(
          'flex h-12 w-[157px] items-center justify-center gap-2 rounded-xl',
          'bg-white lg:h-[61px] lg:w-[200px] lg:rounded-2xl',
        )}
      >
        <img src="/landing/google-play.svg" alt="" className="h-5 w-auto lg:h-[26px]" />
        <span className="font-semibold text-[16px] text-black tracking-[-0.03em] lg:text-[20px]">
          Google Play
        </span>
      </a>
      <a
        href={APP_STORE_URL}
        className={cn(
          'flex h-12 w-[157px] items-center justify-center gap-2 rounded-xl',
          'bg-white lg:h-[61px] lg:w-[200px] lg:rounded-2xl',
        )}
      >
        <img src="/landing/app-store.svg" alt="" className="h-5 w-auto lg:h-[26px]" />
        <span className="font-semibold text-[16px] text-black tracking-[-0.03em] lg:text-[20px]">
          App Store
        </span>
      </a>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="w-full text-white bg-gradient-to-b from-black to-gray-900">
      <LandingNav />

      {/* 히어로 */}
      <section
        className={cn(
          'relative flex flex-col items-center gap-[140px] overflow-hidden py-[120px]',
          'lg:gap-[355px] lg:py-[160px]',
        )}
      >
        <img
          aria-hidden
          src="/landing/hero-bg.webp"
          alt=""
          className={cn(
            'pointer-events-none absolute top-[28%] left-[-23%] w-[136%] max-w-none select-none',
            'lg:top-[11%] lg:left-[-16%] lg:w-[129%]',
          )}
        />
        <div className="relative flex flex-col items-center gap-10 px-6">
          <h1 className="text-center font-bold text-[36px] leading-[48px] tracking-[-0.03em] lg:text-[58px] lg:leading-[1.4]">
            스티커로 <br className="lg:hidden" />
            다시 만나는
            <br />
            앨범 속 추억, 뽀또
          </h1>
          <StoreButtons />
        </div>
        <div className="relative flex flex-col items-center w-full gap-5 px-6">
          <p className="text-center font-semibold text-[22px] tracking-[-0.03em] lg:font-bold lg:text-[40px]">
            스티커로 다시 만나는 앨범 속 추억
          </p>
          <img
            src="/landing/hero-phone.webp"
            alt="뽀또 앱 보드 화면"
            className="w-[360px] max-w-full lg:w-[786px]"
          />
        </div>
      </section>

      {/* 기능 소개 */}
      {FEATURES.map((feature) => (
        <section
          key={feature.label}
          className={cn(
            'flex flex-col items-center justify-center gap-10 px-6 pt-20',
            'lg:h-[720px] lg:gap-20 lg:pt-24',
            feature.imageFirst ? 'lg:flex-row-reverse' : 'lg:flex-row',
          )}
        >
          <div
            className={cn(
              'flex flex-col items-center gap-2 text-center lg:items-start lg:gap-[17px]',
              'lg:text-left',
            )}
          >
            <p
              className={cn(
                'font-semibold text-[18px] text-gray-500 leading-6 tracking-[-0.03em] lg:font-bold lg:text-[24px]',
                'lg:leading-9',
              )}
            >
              {feature.label}
            </p>
            <h2 className="font-bold text-[24px] leading-9 tracking-[-0.03em] lg:text-[36px] lg:leading-[48px]">
              {feature.title[0]}
              <br />
              {feature.title[1]}
            </h2>
          </div>
          <img src={feature.image} alt="" className="w-[277px] shrink-0 lg:w-[347px]" />
        </section>
      ))}

      {/* 다운로드 CTA */}
      <section
        id="download"
        className={cn(
          'relative mt-20 flex flex-col items-center justify-center overflow-hidden',
          'px-6 py-[160px] lg:mt-24 lg:py-[182px]',
        )}
      >
        <div aria-hidden className="absolute inset-0 pointer-events-none select-none">
          <img src="/landing/cta-bg.webp" alt="" className="object-cover size-full" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="relative flex flex-col items-center gap-10">
          <img src="/logo/Logo.svg" alt="PPOTTO" className="w-[280px] lg:w-[391px]" />
          <p className="text-center font-bold text-[24px] leading-9 tracking-[-0.03em] lg:hidden">
            지금 바로, 사진 속
            <br />
            나만의 테마를 발견해보세요!
          </p>
          <p className="hidden text-center font-bold text-[48px] leading-[1.4] tracking-[-0.03em] lg:block">
            지금 바로, 찍어두고 잊었던
            <br />
            사진 속 나만의 테마를 발견하세요!
          </p>
          <StoreButtons />
        </div>
      </section>

      {/* 푸터 */}
      <footer className="px-6 py-6 bg-black lg:px-20">
        <div className="mx-auto flex max-w-[1280px] flex-col">
          <div className="flex justify-end gap-4">
            {/* ponytail: 인스타그램 채널 미정 — 채널 확정 시 href 교체 */}
            <a href="#" aria-label="Instagram">
              <img src="/landing/social-1.svg" alt="" className="size-6" />
            </a>
            <a
              href="https://github.com/Nexters/PPOTTO-client"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <img src="/landing/social-2.svg" alt="" className="size-6" />
            </a>
          </div>
          <p className="text-[14px] text-gray-500 leading-5">문의 📩</p>
          <a href="mailto:ppotto.ism@gmail.com" className="text-[12px] text-gray-500 leading-4">
            ppotto.ism@gmail.com
          </a>
          <div className="mt-6 flex gap-2 text-[12px] text-gray-500 leading-4">
            <a href="#">업데이트 소식</a>
            <a href="#">뽀또 이용 약관</a>
            <a href="#">개인정보 처리방침</a>
          </div>
          <p className="mt-3 text-[12px] text-gray-500 leading-4">
            Copyright © 2026 PPOTTO - Team. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
