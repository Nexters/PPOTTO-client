'use client';

import { AppleLogo, ChevronLeftSmall, KakaoBadge } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { useMeQuery } from '@/entities/user/api/user-queries';
import { bridge } from '@/shared/lib/bridge';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/common/Modal';
import { useToast } from '@/shared/ui/common/Toast';

const APP_VERSION = '1.0.0';
const TERMS_URL =
  'https://onyx-pick-058.notion.site/3b4145d1840e80358e69c80240cc6290?source=copy_link';
const PRIVACY_POLICY_URL =
  'https://onyx-pick-058.notion.site/3b4145d1840e805a9704cebc76c3f4d4?source=copy_link';

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
    run: () => bridge.request('LOGOUT'),
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
    run: () => bridge.request('WITHDRAW'),
  },
};

export function SettingsPage() {
  const { pop } = useFlow();
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
    <main className={cn('flex min-h-full w-full flex-col gap-10 bg-black px-6', 'pt-[62px]')}>
      <header className="relative w-full h-6">
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={() => pop()}
          className="absolute left-0"
        >
          <ChevronLeftSmall />
        </button>
        <h1 className="w-full text-center text-white text-body-01">설정</h1>
      </header>

      <div className="flex flex-col w-full gap-8">
        <Section label="내 계정">
          <Row className="justify-between">
            <div className="flex items-center h-full gap-2">
              {me?.provider === 'KAKAO' && <KakaoBadge />}
              {me?.provider === 'APPLE' && <AppleLogo width={16} height={19} color="white" />}
              <span className="text-white text-body-04">{me?.email ?? '이메일이 없어요'}</span>
            </div>
            <button
              type="button"
              onClick={() => openModal('logout')}
              className="px-2.5 py-1 text-gray-600 border border-gray-700 rounded-full text-caption-01"
            >
              로그아웃
            </button>
          </Row>
        </Section>

        <Section label="보안">
          <ExternalLinkItem href={TERMS_URL}>이용약관</ExternalLinkItem>
          <ExternalLinkItem href={PRIVACY_POLICY_URL}>개인정보 처리방침</ExternalLinkItem>
          <MenuItem>오픈소스</MenuItem>
        </Section>

        <Section label="고객지원">
          <MenuItem>문의하기</MenuItem>
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

function ExternalLinkItem({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Row>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-left text-white text-body-03"
      >
        {children}
      </a>
    </Row>
  );
}
