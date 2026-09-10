import { Download, Filter, Instagram, Kakaotalk } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

type RecapShareListProps = {
  isSaving: boolean;
  isSharingInstagram: boolean;
  isSharingKakao: boolean;
  isShared: boolean;
  isUnsharing: boolean;
  onSaveImage: () => void;
  onInstagramShare: () => void;
  onKakaoShare: () => void;
  onOptionsClick: () => void;
  onUnshare: () => void;
};

// 저장/공유 상태와 실행은 RecapShareSheet가 들고 있다 — 시트가 닫히면 이 컴포넌트는
// 언마운트되므로, 진행 상태를 여기 두면 다시 열었을 때 초기화돼 보인다
export function RecapShareList({
  isSaving,
  isSharingInstagram,
  isSharingKakao,
  isShared,
  isUnsharing,
  onSaveImage,
  onInstagramShare,
  onKakaoShare,
  onOptionsClick,
  onUnshare,
}: RecapShareListProps) {
  return (
    <>
      <span className="text-body-01 text-white">공유하기</span>
      <div className="flex w-full items-start justify-between">
        <button
          type="button"
          disabled={isSharingKakao}
          className="flex w-18 flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={onKakaoShare}
        >
          <Kakaotalk width={48} height={48} />
          <span className="text-caption-01 w-full text-center">카카오톡</span>
        </button>
        <button
          type="button"
          disabled={isSharingInstagram}
          className="flex w-18 flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={onInstagramShare}
        >
          <Instagram width={48} height={48} />
          <span className="text-caption-01 w-full text-center">인스타그램</span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          className="flex w-18 flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={onSaveImage}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
            <Download width={28} height={28} />
          </span>
          <span className="text-caption-01 w-full text-center">
            {isSaving ? '저장 중...' : '이미지 저장'}
          </span>
        </button>
        <button
          type="button"
          className="flex w-18 flex-col items-center gap-2 text-white"
          onClick={onOptionsClick}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
            <Filter width={28} height={28} />
          </span>
          <span className="text-caption-01 w-full text-center">공유 설정</span>
        </button>
      </div>
      {isShared && (
        <button
          type="button"
          disabled={isUnsharing}
          className={cn(
            'flex w-full items-center justify-between',
            'border-t border-gray-800 pt-4 disabled:opacity-50',
          )}
          onClick={onUnshare}
        >
          <span className="text-body-04 font-medium text-white">공유 중인 링크 끄기</span>
          <span className="text-caption-01 text-gray-400">
            {isUnsharing ? '끄는 중...' : '해제'}
          </span>
        </button>
      )}
    </>
  );
}
