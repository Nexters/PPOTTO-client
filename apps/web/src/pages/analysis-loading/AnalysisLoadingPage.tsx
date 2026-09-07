'use client';

import {
  contract,
  type AnalysisLoadingBridgeState,
  type AnalysisLoadingPhaseState,
} from '@ppotto/bridge';
import { useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { boardApi } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { isDevelopmentBrowser } from '@/shared/api/browser-dev-session';
import { bridge } from '@/shared/lib/bridge';
import { preloadStickerImages } from '@/shared/lib/sticker-raster';

import { createLoadingMotion } from './ppotto-loading-motion';
import './ppotto-loading-motion.css';

const BOARD_BG_SRC = '/analysis-loading/board-bg.png';
const STICKER_SRCS = Array.from(
  { length: 9 },
  (_, index) => `/analysis-loading/sticker${index + 1}.png`,
);
const MOCK_NEXT_PHASE: Record<
  AnalysisLoadingBridgeState['visiblePhase'],
  AnalysisLoadingPhaseState
> = {
  SCAN: { visiblePhase: 'GROUP', visualProgress: 50 },
  GROUP: { visiblePhase: 'ASSEMBLE', visualProgress: 75 },
  ASSEMBLE: { visiblePhase: 'DECK', visualProgress: 99 },
  DECK: { visiblePhase: 'REVEAL', visualProgress: 99 },
  REVEAL: { visiblePhase: 'REVEAL', visualProgress: 100 },
};

export function AnalysisLoadingPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { replace } = useFlow();
  const motionRef = useRef<ReturnType<typeof createLoadingMotion>>(undefined);
  const downloadingFromICloudRef = useRef(false);
  const [mockError, setMockError] = useState<string | null>(null);

  const syncICloudNotice = useCallback((downloading: boolean) => {
    downloadingFromICloudRef.current = downloading;
    motionRef.current?.setICloudNotice(downloading);
  }, []);

  const prepareBoard = useCallback(async () => {
    const boards = await queryClient.fetchQuery({
      queryKey: boardQueryKeys.list(),
      queryFn: boardApi.list,
    });
    const boardId = boards[0]?.id;
    if (!boardId) return;

    const board = await queryClient.fetchQuery({
      queryKey: boardQueryKeys.detail(boardId),
      queryFn: () => boardApi.get(boardId),
    });

    await preloadStickerImages(board.stickers.map(({ imageUrl }) => imageUrl));
  }, [queryClient]);

  useEffect(() => bridge.on('SHOW_BOARD', () => replace('Board', {})), [replace]);

  useEffect(
    () => bridge.on('ICLOUD_DOWNLOAD_CHANGED', ({ downloading }) => syncICloudNotice(downloading)),
    [syncICloudNotice],
  );

  useEffect(() => {
    let disposed = false;
    let motion: ReturnType<typeof createLoadingMotion> | undefined;
    const useMock = process.env.NODE_ENV === 'development' && isDevelopmentBrowser();
    const initialState = useMock ? loadMockState() : bridge.request('GET_ANALYSIS_LOADING_STATE');

    void initialState
      .then(async (state) => {
        if (disposed || !mountRef.current) return;
        syncICloudNotice(state.downloadingFromICloud ?? false);
        const jobId = state.jobId ?? null;

        const photos = prepareMotionPhotos(state);
        await preloadImages([...photos.map(({ src }) => src), BOARD_BG_SRC, ...STICKER_SRCS]);
        if (disposed || !mountRef.current) return;

        motion = createLoadingMotion({
          mount: mountRef.current,
          photos,
          phase: state.visiblePhase,
          visualProgress: state.visualProgress,
          speed: 0.6,
          boardBgSrc: BOARD_BG_SRC,
          stickerSrcs: STICKER_SRCS,
          onPhaseStarted: (phase: AnalysisLoadingBridgeState['visiblePhase']) => {
            // 브라우저 모션 실험에서는 실제 보드 API·스티커 사전 로딩도 실행하지 않는다.
            if (useMock) return;
            bridge.send('ANALYSIS_LOADING_PHASE_STARTED', { jobId, phase });
            if (phase === 'REVEAL') {
              void prepareBoard().catch((error) =>
                console.warn('[analysis-loading] 보드 미리 불러오기 실패', error),
              );
            }
          },
          onPhaseFinished: (phase: AnalysisLoadingBridgeState['visiblePhase']) =>
            useMock
              ? Promise.resolve(MOCK_NEXT_PHASE[phase])
              : bridge.request('ANALYSIS_LOADING_PHASE_FINISHED', { jobId, phase }),
          onRevealFinished: () => {
            if (!useMock) bridge.send('ANALYSIS_LOADING_REVEAL_FINISHED', { jobId });
          },
        });
        motionRef.current = motion;
        motion.setICloudNotice(downloadingFromICloudRef.current);
        motion.start();
        if (!useMock) bridge.send('ANALYSIS_LOADING_READY', { jobId });
      })
      .catch((error) => {
        console.error('[analysis-loading] 화면 시작 실패', error);
        if (useMock && !disposed) {
          setMockError(error instanceof Error ? error.message : '목데이터를 불러오지 못했어요.');
        }
      });

    return () => {
      disposed = true;
      motionRef.current = undefined;
      motion?.destroy();
    };
  }, [prepareBoard, syncICloudNotice]);

  return (
    <main ref={mountRef} className="relative h-dvh w-full overflow-hidden bg-black">
      {mockError && (
        <p role="alert" className="p-6 text-white">
          {mockError}
        </p>
      )}
    </main>
  );
}

async function loadMockState(): Promise<AnalysisLoadingBridgeState> {
  const response = await fetch('/api/dev/analysis-loading', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(
      '목데이터를 불러오지 못했어요. mock/generate.mjs로 로컬 이미지 데이터를 생성해 주세요.',
    );
  }
  const state = contract.GET_ANALYSIS_LOADING_STATE.response!.parse(await response.json());
  // 서버 진행을 기다리지 않고 각 막을 한 번씩 재생한다.
  return { ...state, visiblePhase: 'SCAN', visualProgress: 25 };
}

async function preloadImages(sources: string[]) {
  await Promise.allSettled(
    sources.map((src) => {
      const image = new Image();
      image.src = src;
      return image.decode();
    }),
  );
}

function prepareMotionPhotos(state: AnalysisLoadingBridgeState) {
  return state.photos.map((photo) => {
    const hue = hash(photo.id) % 360;
    const saturation = 0.38 + (hash(`${photo.id}:s`) % 30) / 100;
    const lightness = 0.34 + (hash(`${photo.id}:l`) % 18) / 100;
    const color = hslToRgb(hue, saturation, lightness);

    return {
      id: photo.id,
      src: photo.uri,
      w: photo.width,
      h: photo.height,
      ratio: photo.width / photo.height,
      color,
      hue,
      sat: saturation,
      lig: lightness,
      css: `rgb(${color.r},${color.g},${color.b})`,
      tintCss: `hsl(${hue} ${Math.round(saturation * 100)}% 11%)`,
      capturedAt: null,
      burstGroup: null,
    };
  });
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  const [red, green, blue] =
    section < 1
      ? [chroma, secondary, 0]
      : section < 2
        ? [secondary, chroma, 0]
        : section < 3
          ? [0, chroma, secondary]
          : section < 4
            ? [0, secondary, chroma]
            : section < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = lightness - chroma / 2;

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}
