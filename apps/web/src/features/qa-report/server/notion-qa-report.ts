const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';

export interface QaReportSubmission {
  title: string;
  category: '기능' | '디자인';
  currentBehavior: string;
  expectedBehavior: string;
  reportedAt: string;
  buildNumber: string;
  diagnostics: string;
  video: Blob;
}

interface NotionFileUpload {
  id: string;
  upload_url: string;
}

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
  };
}

async function notionRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Notion API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function richText(content: string) {
  return (
    content.match(/[\s\S]{1,2000}/g)?.map((part) => ({ type: 'text', text: { content: part } })) ??
    []
  );
}

function heading(content: string) {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: richText(content) } };
}

function paragraph(content: string) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText(content) } };
}

export async function saveQaReportToNotion(
  report: QaReportSubmission,
  { databaseId, token }: { databaseId: string; token: string },
) {
  const filename = `qa-${report.reportedAt.replace(/[:.]/g, '-')}.mp4`;
  const fileUpload = await notionRequest<NotionFileUpload>(`${NOTION_API}/file_uploads`, {
    method: 'POST',
    headers: { ...notionHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content_type: 'video/mp4' }),
  });

  const fileForm = new FormData();
  fileForm.append('file', report.video, filename);
  await notionRequest(fileUpload.upload_url, {
    method: 'POST',
    headers: notionHeaders(token),
    body: fileForm,
  });

  const page = await notionRequest<{ id: string; url: string }>(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: { ...notionHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parent: { type: 'data_source_id', data_source_id: databaseId },
      properties: {
        이름: { type: 'title', title: richText(report.title) },
        분류: { type: 'select', select: { name: report.category } },
        날짜: { type: 'date', date: { start: report.reportedAt } },
        Build: { type: 'rich_text', rich_text: richText(report.buildNumber) },
      },
      children: [
        heading('문제 (현재 동작)'),
        paragraph(report.currentBehavior),
        heading('기대한 동작'),
        paragraph(report.expectedBehavior),
        heading('직전 15초 영상'),
        {
          object: 'block',
          type: 'video',
          video: { type: 'file_upload', file_upload: { id: fileUpload.id } },
        },
        heading('진단 로그'),
        {
          object: 'block',
          type: 'code',
          code: {
            rich_text: richText(report.diagnostics || '없음'),
            language: 'plain text',
          },
        },
      ],
    }),
  });

  return page;
}
