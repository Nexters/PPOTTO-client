'use client';

import { CheckCircle, CheckCircleEmpty } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useState } from 'react';

import { useAgreeTermsMutation } from '@/entities/terms/api/terms-mutations';
import { useTermsListQuery } from '@/entities/terms/api/terms-queries';
import { userApi } from '@/entities/user/api/user-api';
import { hasSeenOnboarding } from '@/features/onboarding';
import { Button } from '@/shared/ui/common/Button';

const TERMS = [
  {
    code: 'TOS',
    label: '서비스 이용약관',
  },
  {
    code: 'PRIVACY',
    label: '개인정보 처리방침',
  },
] as const;

export function TermsPage() {
  const { replace } = useFlow();
  const { data: currentTerms } = useTermsListQuery();
  const { mutateAsync: agreeTerms, isPending } = useAgreeTermsMutation();
  const [checkedCodes, setCheckedCodes] = useState<string[]>([]);

  const visibleTerms = TERMS.map((term) => ({
    ...term,
    serverTerm: currentTerms?.find(({ code }) => code === term.code),
  }));
  const allChecked = visibleTerms.every(
    ({ code, serverTerm }) => serverTerm?.agreed || checkedCodes.includes(code),
  );
  const canSubmit = visibleTerms.every(({ serverTerm }) => serverTerm) && allChecked;

  const toggle = (code: string) =>
    setCheckedCodes((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code],
    );

  const handleSubmit = async () => {
    try {
      await agreeTerms({
        termIds: visibleTerms.flatMap(({ serverTerm }) => (serverTerm ? [serverTerm.id] : [])),
      });
      const me = await userApi.getMe();
      replace(hasSeenOnboarding(me.id) ? 'Board' : 'Onboarding', {});
    } catch (error) {
      console.error('약관 동의 실패', error);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col px-7.5">
      <h1 className="text-subtitle-01 text-white">
        서비스 이용을 위해
        <br />
        약관에 동의해 주세요
      </h1>

      <div className="mt-10 flex flex-col gap-2">
        <ul>
          {visibleTerms.map(({ code, label, serverTerm }) => {
            const checked = Boolean(serverTerm?.agreed || checkedCodes.includes(code));
            return (
              <li key={code} className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() => {
                    if (!serverTerm?.agreed) toggle(code);
                  }}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <Check checked={checked} />
                  <span className="text-body-06 text-gray-300">
                    <span className="text-white">[필수]</span> {label}
                  </span>
                </button>

                {serverTerm?.contentUrl && (
                  <a
                    href={serverTerm.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-caption-01 text-gray-500 underline"
                  >
                    보기
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Button
        disabled={!canSubmit || isPending}
        onClick={() => void handleSubmit()}
        className="mt-auto"
      >
        동의하고 계속하기
      </Button>
    </main>
  );
}

function Check({ checked }: { checked: boolean }) {
  return checked ? (
    <CheckCircle width={24} height={24} />
  ) : (
    <CheckCircleEmpty width={24} height={24} color="#5c5f66" />
  );
}
