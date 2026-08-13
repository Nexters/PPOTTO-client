import {
  saveQaReportToNotion,
  type QaReportSubmission,
} from '@/features/qa-report/server/notion-qa-report';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_VIDEO_BYTES = 4_000_000;

interface IncomingFormData {
  get(name: string): string | Blob | null;
}

function text(form: IncomingFormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function parseReport(form: IncomingFormData): QaReportSubmission | undefined {
  const category = text(form, 'category');
  const video = form.get('video');
  const report = {
    title: text(form, 'title'),
    category,
    currentBehavior: text(form, 'currentBehavior'),
    expectedBehavior: text(form, 'expectedBehavior'),
    reportedAt: text(form, 'reportedAt'),
    buildNumber: text(form, 'buildNumber'),
    diagnostics: text(form, 'diagnostics'),
  };

  if (
    !report.title ||
    (category !== '기능' && category !== '디자인') ||
    !report.currentBehavior ||
    !report.expectedBehavior ||
    !report.reportedAt ||
    !report.buildNumber ||
    !(video instanceof Blob) ||
    video.type !== 'video/mp4' ||
    video.size === 0 ||
    video.size > MAX_VIDEO_BYTES ||
    Number.isNaN(Date.parse(report.reportedAt))
  ) {
    return undefined;
  }

  return { ...report, category, video };
}

export async function POST(request: Request) {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_QA_DATA_SOURCE_ID;
  if (!token || !databaseId) {
    console.error('[qa-report] environment variables are missing');
    return Response.json({ error: 'QA_REPORT_NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const form = (await request.formData()) as unknown as IncomingFormData;
    const report = parseReport(form);
    if (!report) return Response.json({ error: 'INVALID_QA_REPORT' }, { status: 400 });

    const page = await saveQaReportToNotion(report, { token, databaseId });
    return Response.json({ id: page.id, url: page.url });
  } catch (error) {
    console.error('[qa-report] Notion submission failed', error);
    return Response.json({ error: 'QA_REPORT_SUBMISSION_FAILED' }, { status: 502 });
  }
}
