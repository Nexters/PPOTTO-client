import { useActivity, useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';

import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { Button } from '@/shared/ui/common/Button';

export function BoardNotFound() {
  const { pop, replace } = useFlow();
  const { isRoot } = useActivity();
  const queryClient = useQueryClient();

  const goHome = () => {
    void queryClient.invalidateQueries({ queryKey: boardQueryKeys.summaryList() });
    if (isRoot) replace('Home', {});
    else pop();
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <p className="text-body-04 text-gray-400">보드를 찾을 수 없어요</p>
      <Button size="medium" onClick={goHome}>
        홈으로
      </Button>
    </div>
  );
}
