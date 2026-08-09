import { logPhotoUpload, logPhotoUploadError } from '../lib/photo-upload-log';

import type { UploadJobEvent, UploadJobPhoto, UploadJobState } from './upload-job';

const UPLOAD_CONCURRENCY = 5;

export interface UploadUrl {
  photoId: string;
  uploadUrl: string;
}

export type PutPhotoResult =
  { ok: true } | { ok: false; reason: 'FORBIDDEN' | 'NETWORK' | 'SERVER' };

export interface PutPhotoInput {
  contentType: UploadJobPhoto['contentType'];
  fileUri: string;
  uploadUrl: string;
}

export type AnalysisStatus = 'UPLOADING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export interface UploadRunnerDependencies {
  appendEvent: (event: UploadJobEvent) => Promise<void>;
  cancelAnalysis: (analysisId: string) => Promise<void>;
  clearJob: () => Promise<void>;
  getAnalysisStatus: (analysisId: string) => Promise<AnalysisStatus>;
  putPhoto: (input: PutPhotoInput) => Promise<PutPhotoResult>;
  reissueUploadUrls: (analysisId: string) => Promise<UploadUrl[]>;
  startAnalysis: (analysisId: string) => Promise<void>;
}

export type UploadRunResult = 'ANALYZING' | 'UPLOAD_FAILED' | 'RETRY_CANCEL';

/** 복구된 phase에서 업로드를 재개하고 분석 시작 또는 취소 완료까지 진행한다. */
export async function resumePhotoUpload(
  state: UploadJobState,
  dependencies: UploadRunnerDependencies,
  initialUploadUrls?: readonly UploadUrl[],
): Promise<UploadRunResult> {
  switch (state.phase) {
    case 'PUTTING':
      return resumePutting(state, dependencies, initialUploadUrls);
    case 'STARTING':
      return resumeStarting(state, dependencies);
    case 'CANCELING':
      return cancelAndClear(analysisIdOf(state), dependencies);
    case 'PREPARING':
      throw new Error('PREPARING 작업은 분석 생성 후 재개할 수 있습니다.');
  }
}

async function resumePutting(
  state: UploadJobState,
  dependencies: UploadRunnerDependencies,
  initialUploadUrls?: readonly UploadUrl[],
): Promise<UploadRunResult> {
  const analysisId = analysisIdOf(state);
  const urls = initialUploadUrls ?? (await dependencies.reissueUploadUrls(analysisId));
  const pendingPhotos = findPendingPhotos(state, urls);

  if (!pendingPhotos) {
    logPhotoUploadError('사진 ID와 업로드 URL 매핑 실패', new Error(analysisId));
    return requestCancellation(analysisId, dependencies);
  }

  logPhotoUpload(
    `GCS PUT 시작 (${pendingPhotos.length}장, ${initialUploadUrls ? '최초 URL' : '재발급 URL'})`,
  );
  if (!(await uploadPhotos(analysisId, pendingPhotos, dependencies))) {
    return requestCancellation(analysisId, dependencies);
  }

  logPhotoUpload(`GCS PUT 전체 완료 (${pendingPhotos.length}장)`);
  await dependencies.appendEvent({ type: 'START_REQUESTED' });
  return startAndClear(analysisId, dependencies);
}

async function resumeStarting(
  state: UploadJobState,
  dependencies: UploadRunnerDependencies,
): Promise<UploadRunResult> {
  const analysisId = analysisIdOf(state);
  const status = await dependencies.getAnalysisStatus(analysisId);

  if (status === 'UPLOADING') return startAndClear(analysisId, dependencies);

  await dependencies.clearJob();
  return status === 'FAILED' ? 'UPLOAD_FAILED' : 'ANALYZING';
}

async function uploadPhotos(
  analysisId: string,
  photos: PendingPhoto[],
  dependencies: UploadRunnerDependencies,
): Promise<boolean> {
  let nextIndex = 0;
  let completed = 0;
  let failed = false;
  let refreshedUrls: Promise<UploadUrl[]> | undefined;
  const reissueUrls = () => (refreshedUrls ??= dependencies.reissueUploadUrls(analysisId));

  const worker = async () => {
    while (!failed) {
      const photo = photos[nextIndex++];
      if (!photo) return;

      if (!(await uploadPhoto(photo, reissueUrls, dependencies))) {
        failed = true;
        logPhotoUploadError(`GCS PUT 최종 실패 (${photo.photoId})`, new Error(analysisId));
        continue;
      }

      completed += 1;
      if (completed % 10 === 0 || completed === photos.length) {
        logPhotoUpload(`GCS PUT 진행 ${completed}/${photos.length}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, photos.length) }, worker));
  return !failed;
}

async function uploadPhoto(
  photo: PendingPhoto,
  reissueUrls: () => Promise<UploadUrl[]>,
  dependencies: UploadRunnerDependencies,
): Promise<boolean> {
  const firstAttempt = await dependencies.putPhoto({
    contentType: photo.contentType,
    fileUri: photo.fileUri,
    uploadUrl: photo.uploadUrl,
  });

  if (firstAttempt.ok) return recordUploaded(photo.photoId, dependencies);

  logPhotoUpload(`GCS PUT 재시도 (${photo.photoId}, ${firstAttempt.reason})`);

  const retryUrl =
    firstAttempt.reason === 'FORBIDDEN'
      ? await reissuePhotoUrl(photo.photoId, reissueUrls)
      : photo.uploadUrl;
  if (!retryUrl) {
    logPhotoUploadError(`재발급 URL 누락 (${photo.photoId})`, new Error('URL_NOT_FOUND'));
    return false;
  }

  const retry = await dependencies.putPhoto({
    contentType: photo.contentType,
    fileUri: photo.fileUri,
    uploadUrl: retryUrl,
  });
  if (retry.ok) return recordUploaded(photo.photoId, dependencies);
  logPhotoUploadError(`GCS PUT 재시도 실패 (${photo.photoId}, ${retry.reason})`, retry);
  return false;
}

async function recordUploaded(
  photoId: string,
  dependencies: UploadRunnerDependencies,
): Promise<true> {
  await dependencies.appendEvent({ type: 'PHOTO_UPLOADED', photoId });
  return true;
}

async function reissuePhotoUrl(
  photoId: string,
  reissueUrls: () => Promise<UploadUrl[]>,
): Promise<string | undefined> {
  const urls = await reissueUrls();
  return urls.find((item) => item.photoId === photoId)?.uploadUrl;
}

async function requestCancellation(
  analysisId: string,
  dependencies: UploadRunnerDependencies,
): Promise<UploadRunResult> {
  logPhotoUpload(`업로드 취소 요청 준비 (${analysisId})`);
  await dependencies.appendEvent({ type: 'CANCEL_REQUESTED' });
  return cancelAndClear(analysisId, dependencies);
}

async function cancelAndClear(
  analysisId: string,
  dependencies: UploadRunnerDependencies,
): Promise<UploadRunResult> {
  try {
    await dependencies.cancelAnalysis(analysisId);
    await dependencies.clearJob();
    return 'UPLOAD_FAILED';
  } catch {
    return 'RETRY_CANCEL';
  }
}

async function startAndClear(
  analysisId: string,
  dependencies: UploadRunnerDependencies,
): Promise<UploadRunResult> {
  await dependencies.startAnalysis(analysisId);
  await dependencies.clearJob();
  return 'ANALYZING';
}

interface PendingPhoto {
  contentType: UploadJobPhoto['contentType'];
  photoId: string;
  fileUri: string;
  uploadUrl: string;
}

function findPendingPhotos(
  state: UploadJobState,
  urls: readonly UploadUrl[],
): PendingPhoto[] | null {
  const urlsByPhotoId = new Map(urls.map((item) => [item.photoId, item.uploadUrl]));
  const pendingPhotos: PendingPhoto[] = [];

  for (const photo of allPhotos(state)) {
    const photoId = state.photoIds[photo.clientPhotoId];
    if (!photoId) return null;
    if (state.uploadedPhotoIds.has(photoId)) continue;

    const uploadUrl = urlsByPhotoId.get(photoId);
    if (!uploadUrl) return null;
    pendingPhotos.push({
      contentType: photo.contentType,
      photoId,
      fileUri: photo.fileUri,
      uploadUrl,
    });
  }

  return pendingPhotos;
}

function allPhotos(state: UploadJobState): UploadJobPhoto[] {
  return state.snapshot.groups.flatMap((group) => group.items);
}

function analysisIdOf(state: UploadJobState): string {
  if (!state.analysisId) throw new Error(`${state.phase} 작업에 analysisId가 없습니다.`);
  return state.analysisId;
}
