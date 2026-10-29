import { Instagram, Kakaotalk, Overlap } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

type BoardInvitationContentProps = {
  code: string;
  onCopy: () => void;
};

export function BoardInvitationContent({ code, onCopy }: BoardInvitationContentProps) {
  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h2 className="text-body-01 text-white">초대하기</h2>
        <p className="text-caption-01 text-gray-500">
          친구에게 아래 코드를 보내서 이 보드에 초대하세요
        </p>
      </div>

      <p
        className={cn(
          'w-full pb-2 pl-[0.2em] text-center',
          'text-[32px] leading-12 font-bold tracking-[0.2em] text-white',
        )}
      >
        {code}
      </p>

      <div className="flex items-start gap-2">
        <button type="button" disabled className="flex w-18 flex-col items-center gap-2">
          <Kakaotalk width={48} height={48} />
          <span className="text-caption-01 w-full text-center text-white">카카오톡</span>
        </button>
        <button type="button" disabled className="flex w-18 flex-col items-center gap-2">
          <Instagram width={48} height={48} />
          <span className="text-caption-01 w-full text-center text-white">인스타그램</span>
        </button>
        <button type="button" onClick={onCopy} className="flex w-18 flex-col items-center gap-2">
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
            <Overlap color="white" width={28} height={28} />
          </span>
          <span className="text-caption-01 w-full text-center text-white">복사</span>
        </button>
      </div>
    </>
  );
}
