'use client';

import { ChevronLeft } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useState } from 'react';

import {
  useCreateBoardMutation,
  useUpdateBoardMutation,
} from '@/entities/board/api/board-mutations';
import { getBoardErrorMessage } from '@/features/manage-board';
import { cn } from '@/shared/lib/cn';
import { useKeyboardHeight } from '@/shared/lib/use-keyboard-height';
import { Button } from '@/shared/ui/common/Button';
import { useToast } from '@/shared/ui/common/Toast';

const MAX_NAME_LENGTH = 10;
const SAFE_AREA_TOP = 'var(--rn-safe-area-inset-top, env(safe-area-inset-top))';

type BoardNamePageProps = {
  // 있으면 이름 변경, 없으면 새 보드 생성
  boardId?: string;
  initialName?: string;
};

export function BoardNamePage({ boardId, initialName = '' }: BoardNamePageProps) {
  const isRename = boardId !== undefined;
  const { pop, replace } = useFlow();
  const toast = useToast();
  const keyboardHeight = useKeyboardHeight(true);
  const [name, setName] = useState(initialName);
  const createBoard = useCreateBoardMutation();
  const updateBoard = useUpdateBoardMutation();
  const isPending = createBoard.isPending || updateBoard.isPending;
  const trimmedName = name.trim();
  // 이름 변경은 빈 이름을 받지 않는다. 생성은 비우면 서버가 기본 이름을 붙인다
  const canSubmit = isRename ? trimmedName !== '' && trimmedName !== initialName : true;

  const submit = () => {
    if (!canSubmit || isPending) return;
    if (isRename) {
      updateBoard.mutate(
        { boardId, input: { name: trimmedName } },
        {
          onSuccess: () => {
            toast('보드 이름을 바꿨어요');
            pop();
          },
          onError: (error) =>
            toast(getBoardErrorMessage(error, '이름을 바꾸지 못했어요. 다시 시도해 주세요')),
        },
      );
      return;
    }
    createBoard.mutate(trimmedName ? { name: trimmedName } : {}, {
      onSuccess: (board) => replace('Board', { boardId: board.id }),
      onError: (error) =>
        toast(getBoardErrorMessage(error, '보드를 만들지 못했어요. 다시 시도해 주세요')),
    });
  };

  return (
    <main
      className={cn('relative mx-auto flex h-dvh w-full max-w-107.5 flex-col', 'bg-black px-6')}
    >
      <header
        className="relative flex h-8 items-center justify-center"
        style={{ marginTop: `calc(${SAFE_AREA_TOP} + 20px)` }}
      >
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={() => pop()}
          className="absolute left-0"
        >
          <ChevronLeft color="white" />
        </button>
        <h1 className="text-body-01 text-white">보드 이름 입력</h1>
      </header>

      <div className="mt-8 flex flex-col gap-1">
        <p className="text-body-01 text-white">
          {isRename ? '보드 이름을 바꿔주세요' : '새 보드의 이름을 정해주세요'}
        </p>
        {!isRename && (
          <p className="text-body-06 text-gray-400 opacity-85">비워두면 ‘새 보드’로 만들어져요</p>
        )}
      </div>

      <form
        className="mt-12 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          aria-label="보드 이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder={isRename ? undefined : '새 보드'}
          autoFocus
          enterKeyHint="done"
          className={cn(
            'h-14 w-full rounded-16 bg-gray-900 px-4',
            'text-body-03 text-white outline-none',
            'placeholder:text-gray-500',
          )}
        />
        <p
          className={cn(
            'text-caption-01 text-right',
            name.length > 0 ? 'text-white' : 'text-gray-500',
          )}
        >
          {name.length}/{MAX_NAME_LENGTH}
        </p>
      </form>

      <div
        className="mt-auto px-[18px]"
        style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 12 : 48 }}
      >
        <Button
          onClick={submit}
          disabled={!canSubmit || isPending}
          className="shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
        >
          {isRename ? '변경하기' : '보드 만들기'}
        </Button>
      </div>
    </main>
  );
}
