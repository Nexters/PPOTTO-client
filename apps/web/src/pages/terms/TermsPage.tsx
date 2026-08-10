'use client';

import { CheckCircle, CheckCircleEmpty } from '@ppotto/assets';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/common/Button';

const TERMS = [
  {
    id: 'tos',
    label: '서비스 이용약관',
    required: true,
    url: 'https://onyx-pick-058.notion.site/3b4145d1840e80358e69c80240cc6290?source=copy_link',
  },
  {
    id: 'privacy',
    label: '개인정보 수집 및 이용 동의',
    required: true,
    url: 'https://onyx-pick-058.notion.site/3b4145d1840e805a9704cebc76c3f4d4?source=copy_link',
  },
  { id: 'marketing', label: '마케팅 정보 수신 동의', required: false },
] as const;

export function TermsPage() {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const allChecked = checkedIds.length === TERMS.length;
  const requiredChecked = TERMS.every((term) => !term.required || checkedIds.includes(term.id));

  const toggle = (id: string) =>
    setCheckedIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );

  return (
    <main className="flex min-h-dvh flex-col px-7.5 pt-20 pb-14">
      <h1 className="text-subtitle-01 text-white">
        서비스 이용을 위해
        <br />
        약관에 동의해 주세요
      </h1>

      <div className="mt-10 flex flex-col gap-2">
        <button
          type="button"
          aria-pressed={allChecked}
          onClick={() => setCheckedIds(allChecked ? [] : TERMS.map((term) => term.id))}
          className={cn('flex items-center gap-3 rounded-16 bg-gray-900', 'px-4 py-4 text-left')}
        >
          <Check checked={allChecked} />
          <span className="text-body-03 text-white">전체 동의</span>
        </button>

        <ul>
          {TERMS.map((term) => (
            <li key={term.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                aria-pressed={checkedIds.includes(term.id)}
                onClick={() => toggle(term.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <Check checked={checkedIds.includes(term.id)} />
                <span className="text-body-06 text-gray-300">
                  <span className={term.required ? 'text-white' : 'text-gray-500'}>
                    [{term.required ? '필수' : '선택'}]
                  </span>{' '}
                  {term.label}
                </span>
              </button>

              {'url' in term && (
                <a
                  href={term.url}
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

      <Button disabled={!requiredChecked} className="mt-auto">
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
