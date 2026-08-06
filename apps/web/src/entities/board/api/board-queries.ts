import { useQuery } from '@tanstack/react-query';

import { boardApi } from './board-api';
import { boardQueryKeys } from './board-query-keys';

export const useBoardListQuery = () =>
  useQuery({
    queryKey: boardQueryKeys.list(),
    queryFn: boardApi.list,
  });

export const useBoardQuery = (boardId: string) =>
  useQuery({
    queryKey: boardQueryKeys.detail(boardId),
    queryFn: () => boardApi.get(boardId),
  });
