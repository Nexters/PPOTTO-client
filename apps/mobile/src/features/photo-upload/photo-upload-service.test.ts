/**
 * 새 업로드 실행 경계
 * - 작업을 먼저 영속 저장하고, 저장된 사진 경로로 분석 생성과 PUT을 진행
 * - 최초 PUT에는 POST /analysis 응답 URL을 사용하고 reissue는 호출하지 않음
 * - 모든 PUT 성공 후 분석을 시작하고 로컬 작업을 정리
 * - PREPARING 작업 복구 → 새 분석을 생성하고 업로드 재개
 * - 분석 생성 응답 유실 → 서버의 기존 UPLOADING 분석을 취소하고 다시 생성
 */
import { NetworkError } from '@ppotto/api';

import type { CreateAnalysisInput } from '@/entities/analysis/api/analysis-api';

import {
  resumeSavedPhotoUpload,
  startPhotoUpload,
  type PhotoUploadServiceDependencies,
} from './model/start-photo-upload';
import type { UploadJobEvent, UploadJobSnapshot } from './model/upload-job';
import type { AnalysisStatus, PutPhotoInput, PutPhotoResult } from './model/upload-runner';

it('작업을 저장한 뒤 최초 발급 URL로 업로드하고 분석을 시작한다', async () => {
  const snapshot = uploadJob('file:///cache/a.jpg');
  const persistedSnapshot = uploadJob('file:///documents/photo-upload/job-1/a.jpg');
  const events: UploadJobEvent[] = [];
  const calls: string[] = [];

  const dependencies = {
    saveJob: jest.fn(async (_snapshot: UploadJobSnapshot) => {
      calls.push('save');
    }),
    loadJob: jest.fn(async () => ({ snapshot: persistedSnapshot, events: [...events] })),
    appendEvent: jest.fn(async (event) => {
      events.push(event);
    }),
    clearJob: jest.fn(async () => {
      calls.push('clear');
    }),
    createAnalysis: jest.fn(async (_input: CreateAnalysisInput) => {
      calls.push('create');
      return {
        analysisId: 'analysis-1',
        uploads: [{ photoId: 'server-a', uploadUrl: 'https://upload/initial-a' }],
      };
    }),
    putPhoto: jest.fn(async (_input: PutPhotoInput): Promise<PutPhotoResult> => {
      calls.push('put');
      return { ok: true };
    }),
    reissueUploadUrls: jest.fn(async (_analysisId: string) => []),
    startAnalysis: jest.fn(async (_analysisId: string) => {
      calls.push('start');
    }),
    cancelAnalysis: jest.fn(async (_analysisId: string) => undefined),
    getActiveAnalysis: jest.fn<ReturnType<PhotoUploadServiceDependencies['getActiveAnalysis']>, []>(
      async () => null,
    ),
    getAnalysisStatus: jest.fn(async (_analysisId: string): Promise<AnalysisStatus> => 'UPLOADING'),
  } satisfies PhotoUploadServiceDependencies;

  await expect(startPhotoUpload(snapshot, dependencies)).resolves.toEqual({
    analysisId: 'analysis-1',
    status: 'ANALYZING',
  });

  expect(calls).toEqual(['save', 'create', 'put', 'start', 'clear']);
  expect(dependencies.putPhoto).toHaveBeenCalledWith({
    contentType: 'image/jpeg',
    fileUri: 'file:///documents/photo-upload/job-1/a.jpg',
    uploadUrl: 'https://upload/initial-a',
  });
  expect(dependencies.reissueUploadUrls).not.toHaveBeenCalled();
});

it('PREPARING 작업은 다시 저장하지 않고 분석 생성부터 이어간다', async () => {
  const snapshot = uploadJob('file:///documents/photo-upload/job-1/a.jpg');
  const events: UploadJobEvent[] = [];
  const dependencies = dependenciesFor(snapshot, events);

  await expect(resumeSavedPhotoUpload(dependencies)).resolves.toEqual({
    analysisId: 'analysis-1',
    status: 'ANALYZING',
  });

  expect(dependencies.saveJob).not.toHaveBeenCalled();
  expect(dependencies.createAnalysis).toHaveBeenCalledTimes(1);
  expect(dependencies.putPhoto).toHaveBeenCalledWith({
    contentType: 'image/jpeg',
    fileUri: 'file:///documents/photo-upload/job-1/a.jpg',
    uploadUrl: 'https://upload/initial-a',
  });
});

it('분석 생성 응답이 유실되면 서버의 기존 UPLOADING 분석을 취소하고 다시 생성한다', async () => {
  const snapshot = uploadJob('file:///documents/photo-upload/job-1/a.jpg');
  const events: UploadJobEvent[] = [];
  const calls: string[] = [];
  const dependencies = dependenciesFor(snapshot, events);

  dependencies.createAnalysis
    .mockImplementationOnce(async () => {
      calls.push('create-lost');
      throw new NetworkError(new Error('response lost'));
    })
    .mockImplementationOnce(async () => {
      calls.push('create-retry');
      return {
        analysisId: 'analysis-2',
        uploads: [{ photoId: 'server-a-2', uploadUrl: 'https://upload/retry-a' }],
      };
    });
  dependencies.getActiveAnalysis.mockImplementation(async () => {
    calls.push('get-active');
    return { id: 'analysis-1', status: 'UPLOADING' };
  });
  dependencies.cancelAnalysis.mockImplementation(async () => {
    calls.push('cancel-active');
  });

  await expect(resumeSavedPhotoUpload(dependencies)).resolves.toEqual({
    analysisId: 'analysis-2',
    status: 'ANALYZING',
  });

  expect(calls).toEqual(['create-lost', 'get-active', 'cancel-active', 'create-retry']);
  expect(dependencies.cancelAnalysis).toHaveBeenCalledWith('analysis-1');
  expect(dependencies.putPhoto).toHaveBeenCalledWith({
    contentType: 'image/jpeg',
    fileUri: 'file:///documents/photo-upload/job-1/a.jpg',
    uploadUrl: 'https://upload/retry-a',
  });
});

function dependenciesFor(snapshot: UploadJobSnapshot, events: UploadJobEvent[]) {
  return {
    saveJob: jest.fn(async () => undefined),
    loadJob: jest.fn(async () => ({ snapshot, events: [...events] })),
    appendEvent: jest.fn(async (event: UploadJobEvent) => {
      events.push(event);
    }),
    clearJob: jest.fn(async () => undefined),
    createAnalysis: jest.fn(async () => ({
      analysisId: 'analysis-1',
      uploads: [{ photoId: 'server-a', uploadUrl: 'https://upload/initial-a' }],
    })),
    putPhoto: jest.fn(async (): Promise<PutPhotoResult> => ({ ok: true })),
    reissueUploadUrls: jest.fn(async () => []),
    startAnalysis: jest.fn(async () => undefined),
    cancelAnalysis: jest.fn(async () => undefined),
    getActiveAnalysis: jest.fn<ReturnType<PhotoUploadServiceDependencies['getActiveAnalysis']>, []>(
      async () => null,
    ),
    getAnalysisStatus: jest.fn(async (): Promise<AnalysisStatus> => 'UPLOADING'),
  } satisfies PhotoUploadServiceDependencies;
}

function uploadJob(fileUri: string): UploadJobSnapshot {
  return {
    jobId: 'job-1',
    boardId: 'board-1',
    groups: [
      {
        items: [
          {
            clientPhotoId: 'local-a',
            fileUri,
            contentType: 'image/jpeg',
            takenAt: '2026-08-09T00:00:00.000Z',
            isRepresentative: true,
          },
        ],
      },
    ],
  };
}
