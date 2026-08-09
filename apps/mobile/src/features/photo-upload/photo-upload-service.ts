import { analysisApi } from '@/entities/analysis/api/analysis-api';

import { putPhoto } from './api/put-photo';
import { expoUploadFileSystem, PHOTO_UPLOAD_ROOT_URI } from './lib/expo-upload-file-system';
import { logPhotoUpload, logPhotoUploadError } from './lib/photo-upload-log';
import {
  resumeSavedPhotoUpload,
  startPhotoUpload,
  type PhotoUploadServiceDependencies,
  type StartedPhotoUpload,
} from './model/start-photo-upload';
import { restoreUploadJob, type UploadJobSnapshot } from './model/upload-job';
import { createUploadJobStorage } from './model/upload-storage';
import { waitForAnalysis } from './model/wait-for-analysis';

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
let runId = 0;

export const photoUploadService = {
  start(snapshot: UploadJobSnapshot | Promise<UploadJobSnapshot>) {
    const id = ++runId;
    const startedAt = Date.now();
    logPhotoUpload(`#${id} 시작 — 압축 결과와 작업 스냅샷 대기`);

    currentUpload = (async () => {
      const job = await snapshot;
      const photoCount = job.groups.reduce((count, group) => count + group.items.length, 0);
      logPhotoUpload(`#${id} 작업 준비 완료 (${job.groups.length}그룹, ${photoCount}장)`);

      const { analysisId, status } = await startPhotoUpload(job, dependencies);
      logPhotoUpload(`#${id} 업로드 단계 종료 (${analysisId}, ${status})`);

      if (status !== 'ANALYZING') throw new Error('사진 업로드에 실패했습니다.');
      logPhotoUpload(`#${id} 분석 완료 대기 시작 (${analysisId})`);
      await waitForAnalysis(analysisId, dependencies.getAnalysisStatus);
      logPhotoUpload(`#${id} 전체 완료 (${((Date.now() - startedAt) / 1000).toFixed(2)}초)`);
    })().catch((error) => {
      logPhotoUploadError(`#${id} 실패 (${((Date.now() - startedAt) / 1000).toFixed(2)}초)`, error);
      throw error;
    });
    void currentUpload.catch(() => undefined);
    return currentUpload;
  },

  getCurrent: () => currentUpload,

  async hasPending() {
    if (await storage.loadJob()) return true;
    return Boolean(await analysisApi.getActive());
  },

  resume() {
    const id = ++runId;
    const startedAt = Date.now();
    logPhotoUpload(`#${id} 저장된 작업 재개`);

    currentUpload = (async () => {
      const stored = await storage.loadJob();
      const storedState = stored ? restoreUploadJob(stored.snapshot, stored.events) : null;
      if (storedState?.phase === 'PREPARING') {
        const active = await analysisApi.getActive();
        if (active?.status === 'ANALYZING') {
          await storage.clearJob();
          await waitForAnalysis(active.id, dependencies.getAnalysisStatus);
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
      await waitForAnalysis(active.id, dependencies.getAnalysisStatus);
    })().catch((error) => {
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
  },

  async discard() {
    currentUpload = null;
    try {
      await storage.clearJob();
    } catch {
      // 실패 화면을 빠져나가는 동작은 남은 임시 파일 정리에 막히지 않는다.
    }
  },
};

async function waitForStartedAnalysis(id: number, result: StartedPhotoUpload) {
  logPhotoUpload(`#${id} 업로드 단계 종료 (${result.analysisId}, ${result.status})`);
  if (result.status !== 'ANALYZING') throw new Error('사진 업로드에 실패했습니다.');

  logPhotoUpload(`#${id} 분석 완료 대기 시작 (${result.analysisId})`);
  await waitForAnalysis(result.analysisId, dependencies.getAnalysisStatus);
}
