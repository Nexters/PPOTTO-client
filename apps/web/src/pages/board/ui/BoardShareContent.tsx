import { Download, Filter, Instagram, Kakaotalk } from '@ppotto/assets';

export type BoardShareActions = {
  hasStickers: boolean;
  isSaving: boolean;
  isSharingInstagram: boolean;
  onKakaoShare?: () => void;
  onInstagramShare: () => void;
  onSaveImage: () => void;
};

type BoardShareContentProps = BoardShareActions & {
  onOpenScope: () => void;
};

// 스티커가 없는 보드는 공유할 내용이 없어 공유 설정만 열어 둔다
export function BoardShareContent({
  hasStickers,
  isSaving,
  isSharingInstagram,
  onKakaoShare,
  onInstagramShare,
  onSaveImage,
  onOpenScope,
}: BoardShareContentProps) {
  return (
    <>
      <span className="text-body-01 w-full text-white">공유하기</span>
      <div className="flex w-full items-start justify-between">
        <button
          type="button"
          disabled={!hasStickers || !onKakaoShare}
          className="flex w-18 flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={onKakaoShare}
        >
          <Kakaotalk width={48} height={48} />
          <span className="text-caption-01 w-full text-center">카카오톡</span>
        </button>
        <button
          type="button"
          disabled={!hasStickers || isSharingInstagram}
          className="flex w-18 flex-col items-center gap-2 text-white disabled:opacity-50"
          onClick={onInstagramShare}
        >
          <Instagram width={48} height={48} />
          <span className="text-caption-01 w-full text-center">인스타그램</span>
        </button>
        <button
          type="button"
          disabled={!hasStickers || isSaving}
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
          onClick={onOpenScope}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
            <Filter width={28} height={28} />
          </span>
          <span className="text-caption-01 w-full text-center">공유 설정</span>
        </button>
      </div>
    </>
  );
}
