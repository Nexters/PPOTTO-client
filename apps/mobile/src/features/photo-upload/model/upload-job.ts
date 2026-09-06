// 저장된 이벤트를 순서대로 적용해 현재 업로드 상태를 복구한다.
export type UploadPhase = 'PREPARING' | 'PUTTING' | 'STARTING' | 'CANCELING';

export interface UploadJobPhoto {
  clientPhotoId: string;
  fileUri: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  // 구버전 저장 작업에는 없을 수 있다.
  width?: number;
  height?: number;
  takenAt: string;
  isRepresentative: boolean;
}

export interface UploadJobGroup {
  items: UploadJobPhoto[];
}

export interface UploadJobSnapshot {
  jobId: string;
  boardId: string;
  // 이전 버전에서 저장한 작업에는 없다.
  uploadMode?: 'initial' | 'additional';
  groups: UploadJobGroup[];
}

export type UploadJobEvent =
  | {
      type: 'ANALYSIS_CREATED';
      analysisId: string;
      photoIds: Readonly<Record<string, string>>;
    }
  | { type: 'PHOTO_UPLOADED'; photoId: string }
  | { type: 'START_REQUESTED' }
  | { type: 'CANCEL_REQUESTED' };

export interface UploadJobState {
  snapshot: UploadJobSnapshot;
  phase: UploadPhase;
  analysisId?: string;
  photoIds: Readonly<Record<string, string>>;
  uploadedPhotoIds: ReadonlySet<string>;
}

/** 저장된 이벤트를 순서대로 적용해 앱 재실행 시점의 업로드 상태를 복구한다. */
export function restoreUploadJob(
  snapshot: UploadJobSnapshot,
  events: readonly UploadJobEvent[],
): UploadJobState {
  return events.reduce(reduceUploadJob, initialState(snapshot));
}

function initialState(snapshot: UploadJobSnapshot): UploadJobState {
  return {
    snapshot,
    phase: 'PREPARING',
    photoIds: {},
    uploadedPhotoIds: new Set(),
  };
}

function reduceUploadJob(state: UploadJobState, event: UploadJobEvent): UploadJobState {
  switch (event.type) {
    case 'ANALYSIS_CREATED':
      return {
        ...state,
        phase: 'PUTTING',
        analysisId: event.analysisId,
        photoIds: event.photoIds,
      };
    case 'PHOTO_UPLOADED':
      return {
        ...state,
        uploadedPhotoIds: new Set([...state.uploadedPhotoIds, event.photoId]),
      };
    case 'START_REQUESTED':
      return { ...state, phase: 'STARTING' };
    case 'CANCEL_REQUESTED':
      return { ...state, phase: 'CANCELING' };
  }
}
