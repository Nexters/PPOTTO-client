import type { CreateAnalysisInput } from '@/entities/analysis/api/analysis-api';

import type { UploadJobEvent, UploadJobSnapshot } from './upload-job';
import type { UploadUrl } from './upload-runner';

interface CreateAnalysisResult {
  analysisId: string;
  uploads: UploadUrl[];
}

export interface CreateUploadAnalysisDependencies {
  appendEvent: (event: UploadJobEvent) => Promise<void>;
  createAnalysis: (input: CreateAnalysisInput) => Promise<CreateAnalysisResult>;
}

/** 압축 완료된 그룹으로 분석을 생성하고, 응답 순서로 만든 사진 ID 매핑을 즉시 저장한다. */
export async function createUploadAnalysis(
  snapshot: UploadJobSnapshot,
  dependencies: CreateUploadAnalysisDependencies,
): Promise<CreateAnalysisResult> {
  const photos = snapshot.groups.flatMap((group) => group.items);
  const result = await dependencies.createAnalysis(toCreateAnalysisInput(snapshot));

  await dependencies.appendEvent({
    type: 'ANALYSIS_CREATED',
    analysisId: result.analysisId,
    photoIds: Object.fromEntries(
      photos.map((photo, index) => [photo.clientPhotoId, result.uploads[index]!.photoId]),
    ),
  });

  return result;
}

function toCreateAnalysisInput(snapshot: UploadJobSnapshot): CreateAnalysisInput {
  return {
    boardId: snapshot.boardId,
    photos: snapshot.groups.map((group) => ({
      items: group.items.map(({ contentType, isRepresentative, takenAt }) => ({
        contentType,
        isRepresentative,
        takenAt,
      })),
    })),
  };
}
