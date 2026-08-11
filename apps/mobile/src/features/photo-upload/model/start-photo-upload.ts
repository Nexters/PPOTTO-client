import { NetworkError } from '@ppotto/api';

import {
  createUploadAnalysis,
  type CreateUploadAnalysisDependencies,
} from './create-upload-analysis';
import { restoreUploadJob, type UploadJobSnapshot } from './upload-job';
import {
  resumePhotoUpload,
  type AnalysisStatus,
  type UploadRunnerDependencies,
  type UploadRunResult,
  type UploadUrl,
} from './upload-runner';
import type { UploadJobStorage } from './upload-storage';

/*
 * 새 업로드와 재진입 복구의 진입점이다.
 * PREPARING 단계를 처리한 뒤 생성된 분석은 upload-runner에 넘긴다.
 */
export interface PhotoUploadServiceDependencies
  extends UploadJobStorage, UploadRunnerDependencies, CreateUploadAnalysisDependencies {
  getActiveAnalysis: () => Promise<{ id: string; status: AnalysisStatus } | null>;
}

export interface StartedPhotoUpload {
  analysisId: string;
  status: UploadRunResult;
}

export type DiscardUploadResult = 'DISCARDED' | 'ANALYZING' | 'RETRY';

/** 새 작업을 영속 저장한 뒤 분석 생성부터 사진 업로드와 분석 시작까지 실행한다. */
export async function startPhotoUpload(
  snapshot: UploadJobSnapshot,
  dependencies: PhotoUploadServiceDependencies,
): Promise<StartedPhotoUpload> {
  await dependencies.saveJob(snapshot);

  const savedJob = await loadRequiredJob(dependencies);
  return continuePreparing(savedJob.snapshot, dependencies);
}

/** 앱 재진입 시 저장된 phase부터 업로드를 이어간다. */
export async function resumeSavedPhotoUpload(
  dependencies: PhotoUploadServiceDependencies,
): Promise<StartedPhotoUpload | null> {
  let savedJob = await dependencies.loadJob();
  if (!savedJob) return null;

  let state = restoreUploadJob(savedJob.snapshot, savedJob.events);
  if (state.phase === 'PREPARING') {
    return continuePreparing(savedJob.snapshot, dependencies);
  }

  if (!state.analysisId) throw new Error('저장된 작업에 분석 ID가 없습니다.');
  return {
    analysisId: state.analysisId,
    status: await resumePhotoUpload(state, dependencies),
  };
}

/** 서버 active 상태와 대조해 진행 전 작업만 취소하고 로컬 작업을 정리한다. */
export async function discardSavedPhotoUpload(
  dependencies: PhotoUploadServiceDependencies,
): Promise<DiscardUploadResult> {
  let active: Awaited<ReturnType<PhotoUploadServiceDependencies['getActiveAnalysis']>>;
  try {
    active = await dependencies.getActiveAnalysis();
    if (active?.status === 'UPLOADING') {
      await dependencies.cancelAnalysis(active.id);
    }
  } catch {
    return 'RETRY';
  }

  try {
    await dependencies.clearJob();
  } catch {
    // 실패 화면을 빠져나가는 동작은 남은 임시 파일 정리에 막히지 않는다.
  }
  return active?.status === 'ANALYZING' ? 'ANALYZING' : 'DISCARDED';
}

async function continuePreparing(
  snapshot: UploadJobSnapshot,
  dependencies: PhotoUploadServiceDependencies,
): Promise<StartedPhotoUpload> {
  const analysis = await createAnalysisOrRecover(snapshot, dependencies);
  if (analysis.kind === 'ANALYZING') {
    await dependencies.clearJob();
    return { analysisId: analysis.analysisId, status: 'ANALYZING' };
  }

  const createdJob = await loadRequiredJob(dependencies);
  const status = await resumePhotoUpload(
    restoreUploadJob(createdJob.snapshot, createdJob.events),
    dependencies,
    analysis.uploads,
  );
  return { analysisId: analysis.analysisId, status };
}

async function createAnalysisOrRecover(
  snapshot: UploadJobSnapshot,
  dependencies: PhotoUploadServiceDependencies,
): Promise<CreatedAnalysis | ActiveAnalysis> {
  try {
    return asCreated(await createUploadAnalysis(snapshot, dependencies));
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
  }

  const active = await dependencies.getActiveAnalysis();
  if (active?.status === 'ANALYZING') {
    return { kind: 'ANALYZING', analysisId: active.id };
  }
  if (active?.status === 'UPLOADING') {
    await dependencies.cancelAnalysis(active.id);
  }

  return asCreated(await createUploadAnalysis(snapshot, dependencies));
}

function asCreated(result: { analysisId: string; uploads: UploadUrl[] }): CreatedAnalysis {
  return { kind: 'CREATED', ...result };
}

async function loadRequiredJob(storage: UploadJobStorage) {
  const job = await storage.loadJob();
  if (!job) throw new Error('저장된 업로드 작업이 없습니다.');
  return job;
}

interface CreatedAnalysis {
  kind: 'CREATED';
  analysisId: string;
  uploads: UploadUrl[];
}

interface ActiveAnalysis {
  kind: 'ANALYZING';
  analysisId: string;
}
