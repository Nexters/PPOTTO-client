import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { logPhotoUpload, logPhotoUploadError } from '../lib/photo-upload-log';
import type { PutPhotoInput, PutPhotoResult } from '../model/upload-runner';

/** 로컬 파일을 presigned URL에 업로드하고 runner가 처리할 결과로 변환한다. */
export async function putPhoto({
  contentType,
  fileUri,
  uploadUrl,
}: PutPhotoInput): Promise<PutPhotoResult> {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-goog-content-length-range': '0,15728640',
      },
      body: new File(fileUri),
    });

    if (response.ok) return { ok: true };
    logPhotoUpload(`GCS 응답 실패 (HTTP ${response.status})`);
    return { ok: false, reason: response.status === 403 ? 'FORBIDDEN' : 'SERVER' };
  } catch (error) {
    logPhotoUploadError('GCS 요청 네트워크 오류', error);
    return { ok: false, reason: 'NETWORK' };
  }
}
