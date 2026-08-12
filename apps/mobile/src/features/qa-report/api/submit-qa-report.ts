import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { Video } from 'react-native-compressor';

import { captureQaFetch, formatQaDiagnostics } from '@/shared/lib/qa-diagnostics';

import type { QaReport } from '../model/qa-report';

const MAX_VIDEO_BYTES = 4_000_000;

async function videoForUpload(report: QaReport) {
  if (report.video.size <= MAX_VIDEO_BYTES) return new File(report.video.uri);

  const uri = await Video.compress(report.video.uri, {
    compressionMethod: 'manual',
    bitrate: 1_000_000,
    maxSize: 480,
    stripAudio: true,
  });
  const video = new File(uri);
  if (video.size > MAX_VIDEO_BYTES) throw new Error('QA video is too large after compression');
  return video;
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
