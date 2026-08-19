'use client';

import { AppleLogo, ChevronLeft, KakaoBadge } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { useMeQuery } from '@/entities/user/api/user-queries';
import { bridge } from '@/shared/lib/bridge';
import { cn } from '@/shared/lib/cn';
import { clearStickerImageCache } from '@/shared/lib/sticker-raster';
import { Modal } from '@/shared/ui/common/Modal';
import { useToast } from '@/shared/ui/common/Toast';

const APP_VERSION = '1.0.0';
type ConfirmAction = 'logout' | 'withdraw';

const CONFIRM: Record<
  ConfirmAction,
  {
    title: string;
    description: ReactNode;
    failure: string;
    run: () => Promise<void>;
  }
> = {
  logout: {
    title: '뽀또에서 로그아웃하시겠습니까?',
    description: '현재 계정에서 로그아웃됩니다.',
    failure: '로그아웃에 실패했습니다.',
    run: async () => {
      await clearStickerImageCache();
      await bridge.request('LOGOUT');
    },
  },
  withdraw: {
    title: '뽀또를 탈퇴하시겠습니까?',
    description: (
      <>
        탈퇴 시 모든 계정 정보와 기록이 삭제되며,
        <br />
        이는 복구할 수 없습니다.
      </>
    ),
    failure: '탈퇴에 실패했습니다.',
    run: async () => {
      await clearStickerImageCache();
      await bridge.request('WITHDRAW');
    },
  },
};

export function SettingsPage() {
  const { push, pop } = useFlow();
  const { data: me } = useMeQuery();
  const toast = useToast();
  const [confirming, setConfirming] = useState<ConfirmAction>('logout');
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (action: ConfirmAction) => {
    setConfirming(action);
    setModalOpen(true);
  };

  const runConfirmed = async (action: ConfirmAction) => {
    const { run, failure } = CONFIRM[action];
    setModalOpen(false);
    try {
      await run();
    } catch {
      toast(failure);
    }
  };

  return (
    <main className="flex flex-col w-full min-h-full gap-10 px-6 bg-black">
      <header
        className="relative w-full min-h-6"
        style={{ paddingTop: 'var(--rn-safe-area-inset-top, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={() => pop()}
          className="absolute left-0"
        >
          <ChevronLeft />
        </button>
        <h1 className="w-full text-center text-white text-body-01">설정</h1>
      </header>

      <div className="flex flex-col w-full gap-8">
        <Section label="내 계정">
          <Row className="justify-between gap-3">
            <div className="flex h-full min-w-0 flex-1 items-center gap-2">
              {me?.provider === 'KAKAO' && <KakaoBadge />}
              {me?.provider === 'APPLE' && <AppleLogo width={16} height={19} color="white" />}
              <span className="min-w-0 truncate text-body-04 text-white">
                {me?.email ?? '이메일이 없어요'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openModal('logout')}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full border border-gray-700',
                'px-2.5 py-1 text-caption-01 text-gray-600',
              )}
            >
              로그아웃
            </button>
          </Row>
        </Section>

        <Section label="보안">
          <MenuItem onClick={() => push('TermsDetail', { code: 'TOS' })}>이용약관</MenuItem>
          <MenuItem onClick={() => push('TermsDetail', { code: 'PRIVACY' })}>
            개인정보 처리방침
          </MenuItem>
        </Section>

        <Section label="고객지원">
          <Row>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdNjLlef3peD-8xicPWH1HU7rwHtJEKkKeeOH2MYHtqhY3TSQ/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left text-white text-body-03"
            >
              문의하기
            </a>
          </Row>
        </Section>

        <Section label="앱 정보">
          <Row className="justify-between">
            <span className="text-white text-body-03">버전</span>
            <span className="text-white text-body-04">{APP_VERSION}</span>
          </Row>
          <MenuItem onClick={() => openModal('withdraw')}>탈퇴하기</MenuItem>
        </Section>
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={CONFIRM[confirming].title}
        description={CONFIRM[confirming].description}
      >
        <Modal.Cancel>취소</Modal.Cancel>
        <Modal.Confirm onClick={() => void runConfirmed(confirming)}>확인</Modal.Confirm>
      </Modal>
    </main>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col w-full gap-2">
      <h2 className="w-full text-gray-600 text-caption-01">{label}</h2>
      {children}
    </section>
  );
}

function Row({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex h-[26px] w-full items-center', className)}>{children}</div>;
}

function MenuItem({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <Row>
      <button type="button" onClick={onClick} className="w-full text-left text-white text-body-03">
        {children}
      </button>
    </Row>
  );
}
