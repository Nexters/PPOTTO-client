'use client';

import type { AnalysisLoadingBridgeState } from '@ppotto/bridge';
import { useEffect, useRef } from 'react';

import { bridge } from '@/shared/lib/bridge';

import { createLoadingMotion } from './ppotto-loading-motion';
import './ppotto-loading-motion.css';

export function AnalysisLoadingPage() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let motion: ReturnType<typeof createLoadingMotion> | undefined;

    void bridge
      .request('GET_ANALYSIS_LOADING_STATE')
      .then((state) => {
        if (disposed || !mountRef.current) return;

        motion = createLoadingMotion({
          mount: mountRef.current,
          photoCount: state.photoCount,
          photos: prepareMotionPhotos(state),
          phase: state.visiblePhase,
          visualProgress: state.visualProgress,
          speed: 0.6,
          coverSrc: '/analysis-loading/wrapped-cover.png',
          onPhaseStarted: (phase: AnalysisLoadingBridgeState['visiblePhase']) =>
            bridge.send('ANALYSIS_LOADING_PHASE_STARTED', { phase }),
          onPhaseFinished: (phase: AnalysisLoadingBridgeState['visiblePhase']) =>
            bridge.request('ANALYSIS_LOADING_PHASE_FINISHED', { phase }),
          onRevealFinished: () => bridge.send('ANALYSIS_LOADING_REVEAL_FINISHED'),
        });
        motion.start();
      })
      .catch((error) => console.error('[analysis-loading] 화면 시작 실패', error));

    return () => {
      disposed = true;
      motion?.destroy();
    };
  }, []);

  return <main ref={mountRef} className="relative h-dvh w-full overflow-hidden bg-black" />;
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
