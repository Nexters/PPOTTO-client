import { NetworkError } from '@ppotto/api';
import type { AnalysisLoadingPhase } from '@ppotto/bridge';
import { File } from 'expo-file-system';

import { analysisApi } from '@/entities/analysis/api/analysis-api';

import { putPhoto } from './api/put-photo';
import {
  ANALYSIS_LOADING_PHASE_URI,
  expoUploadFileSystem,
  PHOTO_UPLOAD_ROOT_URI,
} from './lib/expo-upload-file-system';
import { logPhotoUpload, logPhotoUploadError } from './lib/photo-upload-log';
import {
  discardSavedPhotoUpload,
  resumeSavedPhotoUpload,
  startPhotoUpload,
  type PhotoUploadServiceDependencies,
  type StartedPhotoUpload,
} from './model/start-photo-upload';
import { restoreUploadJob, type UploadJobSnapshot } from './model/upload-job';
import { createUploadJobStorage } from './model/upload-storage';
import { AnalysisStatusUnavailableError, waitForAnalysis } from './model/wait-for-analysis';
import { sampleMotionPhotos } from './model/sample-motion-photos';

const storage = createUploadJobStorage(PHOTO_UPLOAD_ROOT_URI, expoUploadFileSystem);

const dependencies: PhotoUploadServiceDependencies = {
  ...storage,
  createAnalysis: async (input) => {
    const photoCount = input.photos.reduce((count, group) => count + group.items.length, 0);
    logPhotoUpload(`POST /analysis 요청 (${input.photos.length}그룹, ${photoCount}장)`);
    const result = await analysisApi.create(input);
    logPhotoUpload(`POST /analysis 완료 (${result.analysisId}, URL ${result.uploads.length}개)`);
    return result;
  },
  cancelAnalysis: async (analysisId) => {
    logPhotoUpload(`DELETE /analysis/${analysisId} 요청`);
    await analysisApi.cancel(analysisId);
    logPhotoUpload(`DELETE /analysis/${analysisId} 완료`);
  },
  getActiveAnalysis: () => analysisApi.getActive(),
  getAnalysisStatus: async (analysisId) => {
    const { status } = await analysisApi.get(analysisId);
    logPhotoUpload(`GET /analysis/${analysisId} → ${status}`);
    return status;
  },
  putPhoto,
  reissueUploadUrls: async (analysisId) => {
    logPhotoUpload(`POST /analysis/${analysisId}/reissue 요청`);
    const { uploads } = await analysisApi.reissueUploadUrls(analysisId);
    logPhotoUpload(`POST /analysis/${analysisId}/reissue 완료 (URL ${uploads.length}개)`);
    return uploads;
  },
  startAnalysis: async (analysisId) => {
    logPhotoUpload(`POST /analysis/${analysisId}/start 요청`);
    await analysisApi.start(analysisId);
    logPhotoUpload(`POST /analysis/${analysisId}/start 완료`);
  },
};

let currentUpload: Promise<void> | null = null;
let currentJobId: string | null = null;
let runId = 0;
const listeners = new Set<() => void>();

export interface UploadMotionPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
  contentType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

interface StartPhotoUploadOptions {
  jobId: string;
  motionPhotos: Promise<readonly UploadMotionPhoto[]>;
  photoCount: number;
  prepareJob: () => Promise<UploadJobSnapshot>;
}

export interface PhotoUploadViewState {
  progress: number;
  status: 'UPLOADING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
}

let viewState: PhotoUploadViewState = { progress: 0, status: 'UPLOADING' };
let motionPhotos: UploadMotionPhoto[] = [];
let motionPhotoCount = 0;
let motionPhotosReady = Promise.resolve();
let webMotionPhotos: UploadMotionPhoto[] | null = null;
let loadingPhaseWrite = Promise.resolve();

const ANALYSIS_LOADING_PHASES = new Set<AnalysisLoadingPhase>([
  'SCAN',
  'GROUP',
  'ASSEMBLE',
  'DECK',
  'REVEAL',
]);

function publish(next: PhotoUploadViewState) {
  viewState = {
    ...next,
    progress:
      next.status === 'COMPLETED'
        ? 100
        : Math.max(viewState.progress, Math.max(0, Math.min(99, next.progress))),
  };
  listeners.forEach((listener) => listener());
}

function publishAnalysis(analysis: PhotoUploadViewState) {
  publish(analysis);
}

function restoreMotionPhotos(snapshot: UploadJobSnapshot) {
  const previousPhotos = new Map(motionPhotos.map((photo) => [photo.id, photo]));
  const representatives = snapshot.groups.map((group) => {
    const photo = group.items.find((item) => item.isRepresentative) ?? group.items[0]!;
    const previous = previousPhotos.get(photo.clientPhotoId);
    return {
      id: photo.clientPhotoId,
      uri: photo.fileUri,
      width: photo.width ?? previous?.width ?? 1,
      height: photo.height ?? previous?.height ?? 1,
      contentType: photo.contentType,
    };
  });
  const restoredById = new Map(representatives.map((photo) => [photo.id, photo]));

  motionPhotoCount = snapshot.groups.reduce((count, group) => count + group.items.length, 0);
  motionPhotos = motionPhotos.length
    ? motionPhotos.map((photo) => restoredById.get(photo.id) ?? photo)
    : sampleMotionPhotos(representatives);
  webMotionPhotos = null;
  viewState = { ...viewState };
  listeners.forEach((listener) => listener());
}

function queueLoadingPhaseWrite(write: () => Promise<void>) {
  const queued = loadingPhaseWrite.then(write);
  loadingPhaseWrite = queued.catch(() => undefined);
  return queued;
}

async function getLastSeenLoadingPhase() {
  await loadingPhaseWrite;
  const phase = await expoUploadFileSystem.readText(ANALYSIS_LOADING_PHASE_URI);
  return ANALYSIS_LOADING_PHASES.has(phase as AnalysisLoadingPhase)
    ? (phase as AnalysisLoadingPhase)
    : undefined;
}

function setLastSeenLoadingPhase(phase: AnalysisLoadingPhase) {
  return queueLoadingPhaseWrite(() =>
    expoUploadFileSystem.writeText(ANALYSIS_LOADING_PHASE_URI, phase),
  );
}

function clearLastSeenLoadingPhase() {
  return queueLoadingPhaseWrite(() =>
    expoUploadFileSystem.deletePathIfExists(ANALYSIS_LOADING_PHASE_URI),
  );
}

async function getMotionPhotosForWeb() {
  await motionPhotosReady;
  if (webMotionPhotos) return webMotionPhotos;

  webMotionPhotos = await Promise.all(
    motionPhotos.map(async (photo) => ({
      ...photo,
      uri: photo.uri.startsWith('data:')
        ? photo.uri
        : `data:${photo.contentType ?? 'image/jpeg'};base64,${await new File(photo.uri).base64()}`,
    })),
  );
  return webMotionPhotos;
}

async function waitUntilComplete(analysisId: string) {
  await waitForAnalysis(analysisId, analysisApi.get, undefined, publishAnalysis);
}

export const photoUploadService = {
  start({
    jobId,
    motionPhotos: preparedMotionPhotos,
    photoCount,
    prepareJob,
  }: StartPhotoUploadOptions) {
    const id = ++runId;
    const startedAt = Date.now();
    currentJobId = jobId;
    viewState = { progress: 0, status: 'UPLOADING' };
    motionPhotoCount = photoCount;
    motionPhotos = [];
    webMotionPhotos = null;
    listeners.forEach((listener) => listener());
    logPhotoUpload(`#${id} 시작 — 모션 사진 준비 대기`);

    void setLastSeenLoadingPhase('SCAN').catch((error) =>
      logPhotoUploadError('로딩 단계 초기화 실패', error),
    );

    motionPhotosReady = preparedMotionPhotos
      .then((photos) => {
        motionPhotos = [...photos];
        if (!motionPhotos.length) {
          logPhotoUploadError(
            '로딩 화면용 사진을 준비하지 못했습니다.',
            new Error('No motion photos'),
          );
        }
      })
      .catch((error) => {
        motionPhotos = [];
        logPhotoUploadError('로딩 화면용 사진 준비 실패', error);
      });
    currentUpload = (async () => {
      logPhotoUpload(`#${id} 모션 시작 — 업로드 사진 압축 시작`);
      const job = await prepareJob();
      const uploadPhotoCount = job.groups.reduce((count, group) => count + group.items.length, 0);
      logPhotoUpload(`#${id} 작업 준비 완료 (${job.groups.length}그룹, ${uploadPhotoCount}장)`);

      const { analysisId, status } = await startPhotoUpload(job, dependencies);
      logPhotoUpload(`#${id} 업로드 단계 종료 (${analysisId}, ${status})`);

      if (status !== 'ANALYZING') throw new Error('사진 업로드에 실패했습니다.');
      logPhotoUpload(`#${id} 분석 완료 대기 시작 (${analysisId})`);
      await waitUntilComplete(analysisId);
      logPhotoUpload(`#${id} 전체 완료 (${((Date.now() - startedAt) / 1000).toFixed(2)}초)`);
    })().catch((error) => {
      publish({ progress: viewState.progress, status: 'FAILED' });
      logPhotoUploadError(`#${id} 실패 (${((Date.now() - startedAt) / 1000).toFixed(2)}초)`, error);
      throw error;
    });
    void currentUpload.catch(() => undefined);
    return currentUpload;
  },

  getCurrent: () => currentUpload,

  getCurrentJobId: () => currentJobId,

  isCurrentJob: (jobId: string | null) => jobId === currentJobId,

  getMotionPhotoCount: () => motionPhotoCount,

  getMotionPhotosForWeb,

  getLastSeenLoadingPhase,

  setLastSeenLoadingPhase,

  getViewState: () => viewState,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  isRecoverableError: (error: unknown) => error instanceof NetworkError,

  isStatusUnavailableError: (error: unknown) => error instanceof AnalysisStatusUnavailableError,

  async hasPending() {
    if (await storage.loadJob()) return true;
    return Boolean(await analysisApi.getActive());
  },

  resume() {
    if (currentUpload) return currentUpload;

    const id = ++runId;
    const startedAt = Date.now();
    viewState = { progress: 0, status: 'UPLOADING' };
    motionPhotos = [];
    motionPhotoCount = 0;
    webMotionPhotos = null;
    logPhotoUpload(`#${id} 저장된 작업 재개`);

    const restoredJob = storage.loadJob().then((stored) => {
      if (stored) {
        currentJobId = stored.snapshot.jobId;
        restoreMotionPhotos(stored.snapshot);
      }
      return stored;
    });
    motionPhotosReady = restoredJob.then(() => undefined);

    currentUpload = (async () => {
      const stored = await restoredJob;
      const storedState = stored ? restoreUploadJob(stored.snapshot, stored.events) : null;
      if (storedState?.phase === 'PREPARING') {
        const active = await analysisApi.getActive();
        if (active?.status === 'ANALYZING') {
          await waitUntilComplete(active.id);
          return;
        }
        if (active?.status === 'UPLOADING') {
          await dependencies.cancelAnalysis(active.id);
        }
      }

      const saved = await resumeSavedPhotoUpload(dependencies);
      if (saved) {
        await waitForStartedAnalysis(id, saved);
        return;
      }

      const active = await analysisApi.getActive();
      if (!active) return;
      if (active.status === 'UPLOADING') {
        await dependencies.cancelAnalysis(active.id);
        throw new Error('업로드를 복구할 로컬 작업이 없습니다.');
      }

      logPhotoUpload(`#${id} 서버 분석 완료 대기 재개 (${active.id})`);
      await waitUntilComplete(active.id);
    })().catch((error) => {
      publish({ progress: viewState.progress, status: 'FAILED' });
      logPhotoUploadError(
        `#${id} 재개 실패 (${((Date.now() - startedAt) / 1000).toFixed(2)}초)`,
        error,
      );
      throw error;
    });
    void currentUpload.catch(() => undefined);
    return currentUpload;
  },

  clearCurrent() {
    currentUpload = null;
    currentJobId = null;
    motionPhotos = [];
    motionPhotoCount = 0;
    webMotionPhotos = null;
    motionPhotosReady = Promise.resolve();
    viewState = { progress: 0, status: 'UPLOADING' };
  },

  async finish() {
    await storage.clearJob();
    await clearLastSeenLoadingPhase();
    currentUpload = null;
    currentJobId = null;
    motionPhotos = [];
    motionPhotoCount = 0;
    webMotionPhotos = null;
    motionPhotosReady = Promise.resolve();
    viewState = { progress: 0, status: 'UPLOADING' };
  },

  async discard() {
    currentUpload = null;
    currentJobId = null;
    const result = await discardSavedPhotoUpload(dependencies);
    if (result === 'DISCARDED') await clearLastSeenLoadingPhase();
    return result;
  },
};

async function waitForStartedAnalysis(id: number, result: StartedPhotoUpload) {
  logPhotoUpload(`#${id} 업로드 단계 종료 (${result.analysisId}, ${result.status})`);
  if (result.status !== 'ANALYZING') throw new Error('사진 업로드에 실패했습니다.');

  logPhotoUpload(`#${id} 분석 완료 대기 시작 (${result.analysisId})`);
  await waitUntilComplete(result.analysisId);
}
