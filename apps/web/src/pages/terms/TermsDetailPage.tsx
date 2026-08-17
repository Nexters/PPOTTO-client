'use client';

import { ChevronLeft } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';

import { Button } from '@/shared/ui/common/Button';
import { cn } from '@/shared/lib/cn';

import { TERMS_CONTENT, TERMS_META, type TermCode } from './terms-content';

type TermsDetailPageProps = {
  code: TermCode;
};

export function TermsDetailPage({ code }: TermsDetailPageProps) {
  const { pop } = useFlow();
  const { detailTitle } = TERMS_META[code];
  const { heading, sections } = TERMS_CONTENT[code];

  return (
    <main
      className={cn('relative flex h-dvh flex-col overflow-hidden bg-black px-6', 'text-white')}
    >
      <header className="relative flex h-18 shrink-0 items-center justify-center">
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={() => pop()}
          className="absolute left-0"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-body-01 text-white">{detailTitle}</h1>
      </header>

      <div className="flex-1 overflow-y-auto pt-2 pb-40">
        <article className="flex flex-col gap-6 rounded-2xl bg-gray-900 px-4 py-5">
          <h2 className="text-body-01 text-gray-100">{heading}</h2>
          {sections.map((section) => (
            <div key={section.chapter} className="flex flex-col gap-6">
              <p className="text-body-02 text-gray-100">{section.chapter}</p>
              {section.articles.map((article) => (
                <div key={article.title} className="flex flex-col gap-2">
                  <p className="text-body-06 text-gray-100">{article.title}</p>
                  <p className="text-body-06 whitespace-pre-line text-gray-500">{article.body}</p>
                </div>
              ))}
            </div>
          ))}
        </article>
      </div>

      <footer
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black from-40% to-transparent',
          'px-6 pt-16 pb-12',
        )}
      >
        <Button onClick={() => pop()}>확인</Button>
      </footer>
    </main>
  );
}
