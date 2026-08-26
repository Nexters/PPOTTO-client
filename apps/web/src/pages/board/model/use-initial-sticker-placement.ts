import { type Dispatch, type RefObject, type SetStateAction, useEffect, useRef } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

import { type CameraState, computeFocusTarget } from './board-camera';
import { toLayoutInput } from './board-layout';
import { computePoissonInitialLayout, type ExistingSticker } from './poisson-cluster';

// 카메라 포커스 범위(AABB) 계산용 스티커 절반 크기 근사치. 실제 이미지 크기를 몰라서(로드해봐야
// 알 수 있음) Sticker.tsx의 STICKER_MAX_EDGE(160)의 절반으로 근사한다. 뱃지(제목)는 줌과 무관하게
// 고정 크기를 유지할 예정이라 이 범위 계산에는 포함하지 않는다.
const STICKER_FIT_HALF_SIZE = 80;

type UnplacedSticker = BoardDetail['stickers'][number];

type UseInitialStickerPlacementParams = {
  boardId: string;
  container: HTMLDivElement | null;
  data: BoardDetail | undefined;
  unplacedStickers: UnplacedSticker[];
  placedStickers: ExistingSticker[];
  queryClient: QueryClient;
  saveLayout: ReturnType<typeof useUpdateBoardLayoutMutation>['mutate'];
  cameraRef: RefObject<CameraState>;
  setCamera: Dispatch<SetStateAction<CameraState>>;
  requestFocus: (target: CameraState) => void;
};

// 새로 생성돼 좌표가 없는 스티커를 빈 공간에 배치하고 저장한 뒤, 그 무리로 카메라를 포커스한다.
export function useInitialStickerPlacement({
  boardId,
  container,
  data,
  unplacedStickers,
  placedStickers,
  queryClient,
  saveLayout,
  cameraRef,
  setCamera,
  requestFocus,
}: UseInitialStickerPlacementParams) {
  // 배치 처리 시작한 스티커 id를 기억해서, 저장 응답이 캐시에 반영되기 전에 리렌더가 껴도
  // 같은 스티커를 다시 계산·저장하지 않게 막는다
  const handledPlacementRef = useRef(new Set<string>());

  useEffect(() => {
    if (!container) return;

    const pending = unplacedStickers.filter(
      (sticker) => !handledPlacementRef.current.has(sticker.id),
    );
    if (pending.length === 0) return;
    pending.forEach((sticker) => handledPlacementRef.current.add(sticker.id));

    const rect = container.getBoundingClientRect();
    const viewport = { width: rect.width, height: rect.height };
    const laidOut = computePoissonInitialLayout(pending, placedStickers);

    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current
        ? {
            ...current,
            stickers: current.stickers.map((sticker) => {
              const placement = laidOut.find((laid) => laid.id === sticker.id);
              return placement ? { ...sticker, ...placement } : sticker;
            }),
          }
        : current,
    );

    saveLayout({ boardId, input: toLayoutInput(laidOut) });

    // 카메라 포커스는 AABB를 계산하므로, 스티커 중심점이 아니라 대략적인 외곽 두 지점을 넘긴다
    const targets = laidOut.flatMap((sticker) => [
      { x: sticker.posX - STICKER_FIT_HALF_SIZE, y: sticker.posY - STICKER_FIT_HALF_SIZE },
      { x: sticker.posX + STICKER_FIT_HALF_SIZE, y: sticker.posY + STICKER_FIT_HALF_SIZE },
    ]);
    if (placedStickers.length === 0) {
      // 최초 배치에는 카메라 애니메이션 없이 바로 포커스 위치로 세팅한다
      setCamera((current) => computeFocusTarget(current, targets, viewport));
    } else {
      requestFocus(computeFocusTarget(cameraRef.current, targets, viewport));
    }
    // unplacedStickers/placedStickers는 data에서 매 렌더 새로 파생되므로 의도적으로 deps에서 제외.
    // data 참조가 실제로 바뀔 때만(우리 자신의 setQueryData 포함) 재실행되면 되고, handledPlacementRef가
    // 중복 처리를 막아준다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, data, boardId, queryClient, saveLayout, cameraRef, setCamera, requestFocus]);
}
