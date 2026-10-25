import { HttpError } from '@ppotto/api';
import { expect, it } from 'vitest';

import { shouldRetryBoardQuery } from './board-queries';

it('보드가 없다는 404 응답은 다시 시도하지 않는다', () => {
  expect(shouldRetryBoardQuery(0, new HttpError(404, 'BOARD-002', null))).toBe(false);
});

it('그 밖의 실패는 3번까지 다시 시도한다', () => {
  const serverError = new HttpError(500, 'COMMON-000', null);

  expect(shouldRetryBoardQuery(2, serverError)).toBe(true);
  expect(shouldRetryBoardQuery(3, serverError)).toBe(false);
});
