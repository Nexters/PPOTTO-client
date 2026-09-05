import type { PhotoUploadFailure } from '@/features/photo-upload';

export interface UploadFailureFeedback {
  confirmLabel: string;
  message: string;
}

// 전용 피드백이 생기면 백엔드의 안정적인 error code를 키로 추가한다.
const FEEDBACK_BY_CODE: Partial<Record<string, UploadFailureFeedback>> = {
  'ANALYSIS-005': {
    confirmLabel: '사진 다시 선택',
    message: '진행 중인 분석을 찾을 수 없어요.\n사진을 다시 선택해 주세요.',
  },
};

const FALLBACK_BY_KIND: Record<PhotoUploadFailure['kind'], UploadFailureFeedback> = {
  'analysis-failed': {
    confirmLabel: '다시 시도',
    message: '스티커 생성에 실패했어요.\n다시 시도해 주세요.',
  },
  'client-error': {
    confirmLabel: '다시 시도',
    message: '요청을 처리하지 못했어요.\n다시 시도해 주세요.',
  },
  'server-error': {
    confirmLabel: '다시 확인',
    message: '서버 상태를 확인하지 못했어요.\n잠시 후 다시 시도해 주세요.',
  },
};

const DEFAULT_FEEDBACK: UploadFailureFeedback = {
  confirmLabel: '다시 시도',
  message: '업로드에 실패했어요.\n다시 시도해 주세요.',
};

export function getUploadFailureFeedback(
  failure: PhotoUploadFailure | undefined,
): UploadFailureFeedback {
  if (!failure) return DEFAULT_FEEDBACK;
  const codeFeedback = failure.code ? FEEDBACK_BY_CODE[failure.code] : undefined;
  if (codeFeedback) return codeFeedback;
  return FALLBACK_BY_KIND[failure.kind];
}
