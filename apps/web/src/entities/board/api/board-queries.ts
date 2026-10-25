import { HttpError } from '@ppotto/api';
import { useQuery } from '@tanstack/react-query';

import { SIGNED_URL_STALE_TIME_MS } from '@/shared/lib/signed-url';

import { boardApi } from './board-api';
import { boardQueryKeys } from './board-query-keys';

export const useBoardListQuery = () =>
  useQuery({
    queryKey: boardQueryKeys.list(),
    queryFn: boardApi.list,
  });

export const useBoardSummaryListQuery = () =>
  useQuery({
    queryKey: boardQueryKeys.summaryList(),
    queryFn: boardApi.listSummaries,
  });

const DEFAULT_RETRY_COUNT = 3;

export const isBoardNotFoundError = (error: unknown) =>
  error instanceof HttpError && error.status === 404;

export const shouldRetryBoardQuery = (failureCount: number, error: unknown) =>
  !isBoardNotFoundError(error) && failureCount < DEFAULT_RETRY_COUNT;

export const useBoardQuery = (boardId?: string) =>
  useQuery({
    queryKey: boardQueryKeys.detail(boardId),
    queryFn: () => boardApi.get(boardId!),
    enabled: !!boardId,
    staleTime: SIGNED_URL_STALE_TIME_MS,
    retry: shouldRetryBoardQuery,
  });
