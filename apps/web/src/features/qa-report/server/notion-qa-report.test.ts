import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveQaReportToNotion } from './notion-qa-report';

afterEach(() => vi.unstubAllGlobals());

describe('saveQaReportToNotion', () => {
  it('영상을 업로드한 뒤 QA 페이지 본문에 첨부한다', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'upload-1', upload_url: 'https://upload.notion.test' })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'uploaded' })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'page-1', url: 'https://notion.test/page-1' })),
      );
    vi.stubGlobal('fetch', fetchMock);

    await saveQaReportToNotion(
      {
        title: '스티커가 튐',
        category: '기능',
        currentBehavior: '위치가 바뀐다',
        expectedBehavior: '위치가 유지된다',
        reportedAt: '2026-08-12T12:00:00.000Z',
        buildNumber: '143',
        diagnostics: 'GET /board → 200',
        video: new File(['video'], 'qa.mp4', { type: 'video/mp4' }),
      },
      { databaseId: 'database-1', token: 'secret' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const createPage = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(createPage.parent).toEqual({ type: 'data_source_id', data_source_id: 'database-1' });
    expect(createPage.properties.이름.title[0].text.content).toBe('스티커가 튐');
    expect(createPage.children).toContainEqual(
      expect.objectContaining({
        type: 'video',
        video: { type: 'file_upload', file_upload: { id: 'upload-1' } },
      }),
    );
  });
});
