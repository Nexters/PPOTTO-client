import { useQuery } from '@tanstack/react-query';

import { boardApi } from './board-api';
import { boardQueryKeys } from './board-query-keys';

export const useBoardQuery = (boardId: string) =>
  useQuery({
    queryKey: boardQueryKeys.detail(boardId),
    queryFn: () => boardApi.get(boardId),
  });
