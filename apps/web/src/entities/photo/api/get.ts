import { unwrap } from '@gallery/api';

import { api } from '@/shared/api/client';

// 목업 스펙(packages/api/openapi/mock.yaml) 기반 패턴 예시 — 실스펙 반영 시 교체
export const get = {
  list: (opts?: { signal?: AbortSignal }) => unwrap(api.GET('/photos', { signal: opts?.signal })),
};
