'use client';

import { type FormEvent, useState } from 'react';

import { loginWithDevelopmentEmail } from '@/shared/api/browser-dev-session';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/common/Modal';

type DevelopmentLoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function DevelopmentLoginModal({
  open,
  onOpenChange,
  onSuccess,
}: DevelopmentLoginModalProps) {
  const [email, setEmail] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasError(false);
    setIsPending(true);
    try {
      await loginWithDevelopmentEmail(email);
      onOpenChange(false);
      onSuccess();
    } catch {
      setHasError(true);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;
        onOpenChange(nextOpen);
        if (!nextOpen) setHasError(false);
      }}
      title="개발 로그인"
      description="카카오로 가입한 이메일을 입력해 주세요."
    >
      <form className="flex w-full flex-col gap-3" onSubmit={login}>
        <label htmlFor="development-login-email" className="sr-only">
          카카오 이메일
        </label>
        <input
          id="development-login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="카카오 이메일"
          autoComplete="email"
          required
          disabled={isPending}
          className={cn(
            'h-12 w-full rounded-xl border border-gray-700 bg-gray-800 px-4',
            'text-body-04 text-white outline-none placeholder:text-gray-600 focus:border-white',
          )}
        />
        {hasError && (
          <p role="alert" className="text-center text-caption-01 text-red-500">
            로그인에 실패했습니다.
          </p>
        )}
        <div className="flex w-full gap-2">
          <Modal.Cancel disabled={isPending}>취소</Modal.Cancel>
          <Modal.Confirm type="submit" disabled={isPending}>
            {isPending ? '로그인 중...' : '로그인'}
          </Modal.Confirm>
        </div>
      </form>
    </Modal>
  );
}
