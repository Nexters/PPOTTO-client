'use client';

import { ChevronLeft, KakaoBadge } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';

import { cn } from '@/shared/lib/cn';

const APP_VERSION = '1.0.0';

export function SettingsPage() {
  const { pop } = useFlow();

  return (
    <main className={cn('flex min-h-full w-full flex-col gap-10 bg-black px-6', 'pt-[62px]')}>
      <header className="relative h-6 w-full">
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={() => pop()}
          className="absolute left-0"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-body-01 w-full text-center text-white">설정</h1>
      </header>

      <div className="flex w-full flex-col gap-8">
        <Section label="내 계정">
          <Row className="justify-between">
            <div className="flex h-full items-center gap-2">
              <KakaoBadge />
              <span className="text-body-04 text-white">PPOTTO@kakao.com</span>
            </div>
            <button
              type="button"
              className="text-caption-01 rounded-full border border-gray-700 px-2 py-1 text-gray-600"
            >
              로그아웃
            </button>
          </Row>
        </Section>

        <Section label="보안">
          <MenuItem>이용약관</MenuItem>
          <MenuItem>개인정보 처리방침</MenuItem>
          <MenuItem>오픈소스</MenuItem>
        </Section>

        <Section label="고객지원">
          <MenuItem>문의하기</MenuItem>
        </Section>

        <Section label="앱 정보">
          <Row className="justify-between">
            <span className="text-body-03 text-white">버전</span>
            <span className="text-body-04 text-white">{APP_VERSION}</span>
          </Row>
          <MenuItem>탈퇴하기</MenuItem>
        </Section>
      </div>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-2">
      <h2 className="text-caption-01 w-full text-gray-600">{label}</h2>
      {children}
    </section>
  );
}

function Row({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex h-[26px] w-full items-center', className)}>{children}</div>;
}

function MenuItem({ children }: { children: React.ReactNode }) {
  return (
    <Row>
      <button type="button" className="text-body-03 w-full text-left text-white">
        {children}
      </button>
    </Row>
  );
}
