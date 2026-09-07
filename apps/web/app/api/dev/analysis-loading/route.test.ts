// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock('node:fs/promises', () => ({ readFile }));

const state = {
  photoCount: 1,
  visiblePhase: 'SCAN',
  visualProgress: 0,
  photos: [{ id: 'mock-1', uri: 'data:image/jpeg;base64,test', width: 480, height: 640 }],
};

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe('development analysis-loading fixture', () => {
  it('개발 요청에서만 로컬 파일을 읽어 캐시 없이 제공한다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    readFile.mockResolvedValue(JSON.stringify(state));

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual(state);
    expect(readFile).toHaveBeenCalledWith(
      expect.stringContaining('/src/pages/analysis-loading/mock/loading-state.local.json'),
      'utf8',
    );
  });

  it.each(['production', 'test'])(
    '%s에서는 개발 로그인 설정과 무관하게 파일 접근 전 404를 반환한다',
    async (mode) => {
      vi.stubEnv('NODE_ENV', mode);
      vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');

      expect((await GET()).status).toBe(404);
      expect(readFile).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '{invalid json', JSON.stringify({ ...state, photos: [] })])(
    '파일이 없거나 유효하지 않으면 생성 안내를 반환한다 (%s)',
    async (contents) => {
      vi.stubEnv('NODE_ENV', 'development');
      if (contents === undefined) readFile.mockRejectedValue(new Error('ENOENT: private path'));
      else readFile.mockResolvedValue(contents);

      const response = await GET();
      expect(response.status).toBe(500);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({
        message: 'mock/generate.mjs로 유효한 로컬 이미지 데이터를 생성해 주세요.',
      });
    },
  );
});
