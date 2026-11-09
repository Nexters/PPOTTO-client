import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AnalyticsTrackArgs } from '@ppotto/bridge';

import { track } from '@/shared/lib/bridge';

import {
  boardApi,
  type CreateBoardInput,
  type UpdateBoardInput,
  type UpdateBoardLayoutInput,
} from './board-api';
import { boardQueryKeys } from './board-query-keys';

type UpdateBoardLayoutVariables = {
  boardId: string;
  input: UpdateBoardLayoutInput;
  // 사용자 편집만 전달한다. 자동 배치/초기화 저장은 통계에서 제외한다.
  analytics?: AnalyticsTrackArgs[];
};

export const useUpdateBoardLayoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, input }: UpdateBoardLayoutVariables) =>
      boardApi.updateLayout(boardId, input),
    retry: 2,
    onSuccess: (_data, { analytics }) => {
      analytics?.forEach((event) => track(...event));
    },
    // 낙관적으로 미리 반영한 캐시가 실패 후에도 오래 남아있지 않도록(staleTime 55분) 서버 상태로 되돌린다
    onError: (_error, variables) => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(variables.boardId) });
    },
  });
};

export const useCreateBoardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBoardInput) => boardApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardQueryKeys.summaryList() }),
  });
};

type UpdateBoardVariables = { boardId: string; input: UpdateBoardInput };

export const useUpdateBoardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, input }: UpdateBoardVariables) => boardApi.update(boardId, input),
    onSuccess: (_data, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.summaryList() });
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) });
    },
  });
};

export const useDeleteBoardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => boardApi.delete(boardId),
    // 삭제된 보드의 상세 캐시는 건드리지 않는다. 보드 화면에서 삭제 직후 재조회되면 404 화면이 잠깐 보인다
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardQueryKeys.summaryList() }),
  });
};

export const useIssueBoardInvitationMutation = () =>
  useMutation({
    mutationFn: (boardId: string) => boardApi.issueInvitation(boardId),
  });
