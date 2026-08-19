'use client';

import {
  Check,
  CheckCircle,
  CheckCircleEmpty,
  ChevronLeft,
  ChevronLeftSmall,
  Logo,
} from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useState } from 'react';

import { useAgreeTermsMutation } from '@/entities/terms/api/terms-mutations';
import { useTermsListQuery } from '@/entities/terms/api/terms-queries';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/common/Button';

import { TERMS_META, type TermCode } from './terms-content';

const TERM_CODES: TermCode[] = ['TOS', 'PRIVACY'];

export function TermsPage() {
  const { push, pop, replace } = useFlow();
  const { data: currentTerms } = useTermsListQuery();
  const { mutateAsync: agreeTerms, isPending } = useAgreeTermsMutation();
  const [checkedCodes, setCheckedCodes] = useState<string[]>([]);

  const visibleTerms = TERM_CODES.map((code) => ({
    code,
    label: TERMS_META[code].label,
    serverTerm: currentTerms?.find((term) => term.code === code),
  }));
  const allChecked = visibleTerms.every(
    ({ code, serverTerm }) => serverTerm?.agreed || checkedCodes.includes(code),
  );
  const canSubmit = visibleTerms.every(({ serverTerm }) => serverTerm) && allChecked;

  const toggle = (code: string) =>
    setCheckedCodes((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code],
    );

  const toggleAll = () => {
    const togglableCodes = visibleTerms
      .filter(({ serverTerm }) => !serverTerm?.agreed)
      .map(({ code }) => code);
    setCheckedCodes(allChecked ? [] : togglableCodes);
  };

  const handleSubmit = async () => {
    try {
      await agreeTerms({
        termIds: visibleTerms.flatMap(({ serverTerm }) => (serverTerm ? [serverTerm.id] : [])),
      });
      replace('Board', {});
    } catch (error) {
      console.error('약관 동의 실패', error);
    }
  };

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-black px-6 text-white">
      <header
        className="relative flex min-h-18 shrink-0 items-center justify-center"
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
        <Logo width={105} height={32} />
      </header>

      <div className="mt-9 flex flex-col gap-4">
        <h1 className="text-subtitle-01 whitespace-pre-line text-white">
          {'서비스 이용을 위해\n약관에 동의가 필요해요'}
        </h1>
        <p className="text-body-06 text-gray-500">
          서비스 제공에 필요한 정보만 수집하며,
          <br />
          자세한 내용은 아래에서 확인할 수 있어요.
        </p>
      </div>

      <div className="flex-1" />

      <section className="flex flex-col gap-5">
        <button
          type="button"
          aria-pressed={allChecked}
          onClick={toggleAll}
          className={cn(
            'flex h-14 w-full items-center gap-2 rounded-lg px-4',
            allChecked ? 'bg-gray-900' : 'border-2 border-gray-900',
          )}
        >
          {allChecked ? (
            <CheckCircle width={24} height={24} />
          ) : (
            <CheckCircleEmpty width={24} height={24} color="#5c5f66" />
          )}
          <span className="text-body-03 text-gray-100">약관 전체동의</span>
        </button>

        <ul className="flex flex-col gap-4 pr-2 pl-4">
          {visibleTerms.map(({ code, label, serverTerm }) => {
            const checked = Boolean(serverTerm?.agreed || checkedCodes.includes(code));
            return (
              <li key={code} className="flex items-center justify-between">
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() => {
                    if (!serverTerm?.agreed) toggle(code);
                  }}
                  className="flex items-center gap-4"
                >
                  <Check width={16} height={16} color={checked ? 'white' : '#5c5f66'} />
                  <span className="text-body-04 text-gray-100">{label}</span>
                </button>
                <button
                  type="button"
                  aria-label={`${label} 상세보기`}
                  onClick={() => push('TermsDetail', { code })}
                  className="flex size-6 items-center justify-center"
                >
                  <span className="flex rotate-180">
                    <ChevronLeftSmall />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="shrink-0 pt-8 pb-12">
        <Button disabled={!canSubmit || isPending} onClick={() => void handleSubmit()}>
          동의하고 계속하기
        </Button>
      </footer>
    </main>
  );
}
