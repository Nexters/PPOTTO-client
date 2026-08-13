import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { captureQaFetch, formatQaDiagnostics } from '@/shared/lib/qa-diagnostics';

import { compressVideo } from '../../../../modules/qa-screen-recorder';
import type { QaReport } from '../model/qa-report';

const MAX_VIDEO_BYTES = 4_000_000;

async function videoForUpload(report: QaReport) {
  if (report.video.size <= MAX_VIDEO_BYTES) return new File(report.video.uri);

  const compressed = await compressVideo(report.video.uri, MAX_VIDEO_BYTES);
  if (compressed.size > MAX_VIDEO_BYTES) {
    throw new Error('QA video is too large after compression');
  }
  return new File(compressed.uri);
}

export async function submitQaReport(report: QaReport) {
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL;
  if (!webUrl) throw new Error('EXPO_PUBLIC_WEB_URL is required');

  const form = new FormData();
  form.append('title', report.title);
  form.append('category', report.category);
  form.append('currentBehavior', report.currentBehavior);
  form.append('expectedBehavior', report.expectedBehavior);
  form.append('reportedAt', report.reportedAt);
  form.append('buildNumber', report.buildNumber);
  form.append('diagnostics', formatQaDiagnostics(report.diagnostics));
  form.append('video', await videoForUpload(report), 'qa-report.mp4');

  const url = `${webUrl.replace(/\/$/, '')}/api/qa-report`;
  const init = {
    method: 'POST',
    body: form,
  };
  const response = await captureQaFetch(() => fetch(url, init), url, init);
  if (!response.ok) throw new Error(`QA report upload failed: ${response.status}`);
}
