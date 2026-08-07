'use client';

import type { paths } from '@ppotto/api';
import { CheckCircle, CheckCircleEmpty } from '@ppotto/assets';
import { useState } from 'react';

import { useAgreeTermsMutation } from '@/entities/terms/api/terms-mutations';
import { cn } from '@/shared/lib/cn';

type Term = NonNullable<
  paths['/terms']['get']['responses']['200']['content']['application/json']['data']
>[number];

// ponytail: GET /terms 연결 전까지 쓰는 목업. 실제 응답으로 갈아끼우면 타입은 그대로 맞는다.
const MOCK_TERMS: Term[] = [
  {
    id: '01983f2a-1a2b-7c3d-8e4f-5a6b7c8d9e0f',
    code: 'TOS',
    version: '1.0',
    isRequired: true,
    agreed: false,
    contentUrl: 'https://nexters.notion.site/ppotto-tos',
  },
  {
    id: '01983f2a-2b3c-7d4e-9f5a-6b7c8d9e0f1a',
    code: 'PRIVACY',
    version: '1.0',
    isRequired: true,
    agreed: false,
    contentUrl: 'https://nexters.notion.site/ppotto-privacy',
  },
  {
    id: '01983f2a-3c4d-7e5f-a6b7-8c9d0e1f2a3b',
    code: 'MARKETING',
    version: '1.0',
    isRequired: false,
    agreed: false,
    contentUrl: null,
  },
];

const TERM_LABELS: Record<string, string> = {
  TOS: '서비스 이용약관',
  PRIVACY: '개인정보 수집 및 이용 동의',
  MARKETING: '마케팅 정보 수신 동의',
};

export function TermsPage() {
  const terms = MOCK_TERMS;
  const [agreedIds, setAgreedIds] = useState<string[]>(() =>
    terms.filter((term) => term.agreed).map((term) => term.id),
  );
  const { mutate: agree, isPending, isSuccess, isError } = useAgreeTermsMutation();

  const isAgreed = (id: string) => agreedIds.includes(id);
  const allAgreed = terms.every((term) => isAgreed(term.id));
  const requiredMet = terms.every((term) => !term.isRequired || isAgreed(term.id));

  const toggle = (id: string) =>
    setAgreedIds((previous) =>
      previous.includes(id) ? previous.filter((it) => it !== id) : [...previous, id],
    );

  const toggleAll = () => setAgreedIds(allAgreed ? [] : terms.map((term) => term.id));

  return (
    <main className="flex min-h-dvh flex-col bg-black px-[30px] pt-[80px] pb-[56px]">
      <h1 className="text-subtitle-01 text-white">
        서비스 이용을 위해
        <br />
        약관에 동의해 주세요
      </h1>

      <div className="mt-10 flex flex-col gap-2">
        <button
          type="button"
          aria-pressed={allAgreed}
          onClick={toggleAll}
          className={cn('flex items-center gap-3 text-left', 'rounded-16 bg-gray-900 px-4 py-4')}
        >
          <Check checked={allAgreed} />
          <span className="text-body-03 text-white">전체 동의</span>
        </button>

        <ul className="flex flex-col">
          {terms.map((term) => (
            <li key={term.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                aria-pressed={isAgreed(term.id)}
                onClick={() => toggle(term.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <Check checked={isAgreed(term.id)} />
                <span className="text-body-06 text-gray-300">
                  <span className={term.isRequired ? 'text-white' : 'text-gray-500'}>
                    [{term.isRequired ? '필수' : '선택'}]
                  </span>{' '}
                  {TERM_LABELS[term.code] ?? term.code}
                </span>
              </button>

              {term.contentUrl && (
                <a
                  href={term.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption-01 text-gray-500 underline"
                >
                  보기
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {isError && (
          <p className="text-caption-01 text-center text-red-300">
            동의 저장에 실패했어요. 다시 시도해 주세요.
          </p>
        )}
        {isSuccess && <p className="text-caption-01 text-center text-gray-400">동의 완료</p>}

        <button
          type="button"
          disabled={!requiredMet || isPending}
          onClick={() => agree({ termIds: agreedIds })}
          className={cn(
            'text-body-03 flex h-12 w-full items-center justify-center rounded-full',
            requiredMet && !isPending ? 'bg-white text-black' : 'bg-gray-800 text-gray-500',
          )}
        >
          {isPending ? '저장 중...' : '동의하고 계속하기'}
        </button>
      </div>
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
