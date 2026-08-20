import { describe, expect, it } from 'vitest';

import { getFilmstripSyncBehavior } from './use-filmstrip-sync';

describe('getFilmstripSyncBehavior', () => {
  it('펼쳐진 그룹이 바뀌면 목록 재배치와 겹치지 않도록 즉시 정렬한다', () => {
    expect(
      getFilmstripSyncBehavior({
        isFirstSync: false,
        isOwnScrollUpdate: false,
        previousExpandedGroup: 1,
        expandedGroup: 2,
      }),
    ).toBe('auto');
  });

  it('같은 그룹 안에서 사진만 바뀌면 부드럽게 이동한다', () => {
    expect(
      getFilmstripSyncBehavior({
        isFirstSync: false,
        isOwnScrollUpdate: false,
        previousExpandedGroup: 1,
        expandedGroup: 1,
      }),
    ).toBe('smooth');
  });

  it('그룹이 펼쳐지지 않은 일반 사진 사이에서는 부드럽게 이동한다', () => {
    expect(
      getFilmstripSyncBehavior({
        isFirstSync: false,
        isOwnScrollUpdate: false,
        previousExpandedGroup: null,
        expandedGroup: null,
      }),
    ).toBe('smooth');
  });
});
