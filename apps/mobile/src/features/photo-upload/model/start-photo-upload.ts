import {
  createUploadAnalysis,
  type CreateUploadAnalysisDependencies,
} from './create-upload-analysis';
import { restoreUploadJob, type UploadJobSnapshot } from './upload-job';
import {
  resumePhotoUpload,
  type UploadRunnerDependencies,
  type UploadRunResult,
} from './upload-runner';
import type { UploadJobStorage } from './upload-storage';

export interface PhotoUploadServiceDependencies
  extends UploadJobStorage, UploadRunnerDependencies, CreateUploadAnalysisDependencies {}

export interface StartedPhotoUpload {
  analysisId: string;
  status: UploadRunResult;
}

/** 새 작업을 영속 저장한 뒤 분석 생성부터 사진 업로드와 분석 시작까지 실행한다. */
export async function startPhotoUpload(
  snapshot: UploadJobSnapshot,
  dependencies: PhotoUploadServiceDependencies,
): Promise<StartedPhotoUpload> {
  await dependencies.saveJob(snapshot);

  const savedJob = await loadRequiredJob(dependencies);
  const { analysisId, uploads } = await createUploadAnalysis(savedJob.snapshot, dependencies);
  const createdJob = await loadRequiredJob(dependencies);

  const status = await resumePhotoUpload(
    restoreUploadJob(createdJob.snapshot, createdJob.events),
    dependencies,
    uploads,
  );
  return { analysisId, status };
}

/** 앱 재진입 시 저장된 phase부터 업로드를 이어간다. */
export async function resumeSavedPhotoUpload(
  dependencies: PhotoUploadServiceDependencies,
): Promise<StartedPhotoUpload | null> {
  let savedJob = await dependencies.loadJob();
  if (!savedJob) return null;

  let state = restoreUploadJob(savedJob.snapshot, savedJob.events);
  if (state.phase === 'PREPARING') {
    const created = await createUploadAnalysis(savedJob.snapshot, dependencies);
    savedJob = await loadRequiredJob(dependencies);
    state = restoreUploadJob(savedJob.snapshot, savedJob.events);
    return {
      analysisId: created.analysisId,
      status: await resumePhotoUpload(state, dependencies, created.uploads),
    };
  }

  if (!state.analysisId) throw new Error('저장된 작업에 분석 ID가 없습니다.');
  return {
    analysisId: state.analysisId,
    status: await resumePhotoUpload(state, dependencies),
  };
}

async function loadRequiredJob(storage: UploadJobStorage) {
  const job = await storage.loadJob();
  if (!job) throw new Error('저장된 업로드 작업이 없습니다.');
  return job;
}
