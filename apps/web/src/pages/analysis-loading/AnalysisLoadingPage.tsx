'use client';

import type { AnalysisLoadingBridgeState } from '@ppotto/bridge';
import { useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { boardApi } from '@/entities/board/api/board-api';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { bridge } from '@/shared/lib/bridge';
import { preloadStickerImages } from '@/shared/lib/sticker-raster';

import { createLoadingMotion } from './ppotto-loading-motion';
import './ppotto-loading-motion.css';

const BOARD_BG_SRC = '/analysis-loading/board-bg.png';
const STICKER_SRCS = Array.from(
  { length: 9 },
  (_, index) => `/analysis-loading/sticker${index + 1}.png`,
);

export function AnalysisLoadingPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { replace } = useFlow();
  const motionRef = useRef<ReturnType<typeof createLoadingMotion>>(undefined);
  const downloadingFromICloudRef = useRef(false);

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

    void bridge
      .request('GET_ANALYSIS_LOADING_STATE')
      .then(async (state) => {
        if (disposed || !mountRef.current) return;
        syncICloudNotice(state.downloadingFromICloud ?? false);

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
            bridge.send('ANALYSIS_LOADING_PHASE_STARTED', { phase });
            if (phase === 'REVEAL') {
              void prepareBoard().catch((error) =>
                console.warn('[analysis-loading] 보드 미리 불러오기 실패', error),
              );
            }
          },
          onPhaseFinished: (phase: AnalysisLoadingBridgeState['visiblePhase']) =>
            bridge.request('ANALYSIS_LOADING_PHASE_FINISHED', { phase }),
          onRevealFinished: () => bridge.send('ANALYSIS_LOADING_REVEAL_FINISHED'),
        });
        motionRef.current = motion;
        motion.setICloudNotice(downloadingFromICloudRef.current);
        motion.start();
        bridge.send('ANALYSIS_LOADING_READY');
      })
      .catch((error) => console.error('[analysis-loading] 화면 시작 실패', error));

    return () => {
      disposed = true;
      motionRef.current = undefined;
      motion?.destroy();
    };
  }, [prepareBoard, syncICloudNotice]);

  return <main ref={mountRef} className="relative h-dvh w-full overflow-hidden bg-black" />;
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
