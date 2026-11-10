'use client';

import { ChevronLeft } from '@ppotto/assets';
import { useActivity, useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import {
  boardInvitationQueryOptions,
  isBoardNotFoundError,
} from '@/entities/board/api/board-queries';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/common/Button';
import { useToast } from '@/shared/ui/common/Toast';

const INVITATION_CODE_LENGTH = 6;

export function BoardJoinCodePage() {
  const { pop, push } = useFlow();
  const { isActive } = useActivity();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const requestGeneration = useRef(0);
  const isMounted = useRef(true);
  const wasActive = useRef(isActive);
  const isComplete = code.length === INVITATION_CODE_LENGTH;

  const changeCode = (value: string) => {
    requestGeneration.current += 1;
    setIsChecking(false);
    setCode(
      value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, INVITATION_CODE_LENGTH),
    );
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      requestGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    if (isActive && !wasActive.current) setIsChecking(false);
    wasActive.current = isActive;
  }, [isActive]);

  const goBack = () => {
    requestGeneration.current += 1;
    pop();
  };

  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isComplete || isChecking) return;

    const submittedCode = code;
    const generation = ++requestGeneration.current;
    setIsChecking(true);
    try {
      await queryClient.fetchQuery(boardInvitationQueryOptions(submittedCode));
      if (!isMounted.current || generation !== requestGeneration.current) return;

      push('BoardJoinConfirm', { code: submittedCode });
    } catch (error) {
      if (!isMounted.current || generation !== requestGeneration.current) return;

      setIsChecking(false);
      toast(
        isBoardNotFoundError(error)
          ? '유효하지 않은 초대 코드예요'
          : '초대 정보를 불러오지 못했어요',
      );
    }
  };

  return (
    <main
      className={cn(
        'relative mx-auto flex h-dvh w-full max-w-107.5 flex-col',
        'overflow-hidden bg-black px-6 text-white',
      )}
    >
      <form onSubmit={(event) => void submitCode(event)} className="contents">
        <header
          className="relative grid min-h-18 shrink-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center"
          style={{
            paddingTop: 'calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 0.75rem)',
          }}
        >
          <button
            type="button"
            aria-label="뒤로 가기"
            onClick={goBack}
            className="flex size-10 items-center justify-start"
          >
            <ChevronLeft />
          </button>
          <h1 className="text-center text-body-01">초대 코드 입력</h1>
          <span aria-hidden />
        </header>

        <section className="pt-8">
          <h2 className="text-body-01">초대 코드를 입력해주세요</h2>
          <p className="mt-1 text-body-06 text-gray-400">친구에게 받은 영문·숫자 6자리예요</p>

          <div className="mt-12">
            <label htmlFor="board-join-code" className="sr-only">
              초대 코드
            </label>
            <input
              id="board-join-code"
              value={code}
              onChange={(event) => changeCode(event.target.value)}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={INVITATION_CODE_LENGTH}
              placeholder="초대 코드"
              className={cn(
                'h-14 w-full rounded-2xl bg-gray-900 px-4',
                'text-body-03 text-white outline-none placeholder:text-gray-500',
              )}
            />
            <span
              className={cn(
                'mt-2 block text-right text-caption-01',
                isComplete ? 'text-white' : 'text-gray-500',
              )}
            >
              {code.length}/{INVITATION_CODE_LENGTH}
            </span>
          </div>
        </section>

        <footer
          className={cn(
            'absolute inset-x-0 bottom-0 bg-linear-to-t from-black',
            'from-40% to-transparent px-6 pt-16 pb-12',
          )}
        >
          <Button type="submit" disabled={!isComplete || isChecking}>
            다음
          </Button>
        </footer>
      </form>
    </main>
  );
}
