import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLoadingMotion } from './ppotto-loading-motion';

afterEach(() => vi.unstubAllGlobals());

describe('ppotto loading motion', () => {
  it('서버가 이미 완료됐어도 모든 막을 순서대로 한 번씩 재생한다', async () => {
    let now = 0;
    let nextFrameId = 0;
    let frames: Array<(time: number) => void> = [];
    vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
      frames.push(callback);
      return ++nextFrameId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const mount = document.createElement('div');
    mount.getBoundingClientRect = () => ({
      bottom: 740,
      height: 740,
      left: 0,
      right: 360,
      top: 0,
      width: 360,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });
    document.body.appendChild(mount);

    const phases = ['SCAN', 'GROUP', 'ASSEMBLE', 'DECK', 'REVEAL'] as const;
    const started: string[] = [];
    let repeatedAssemble = false;
    const onRevealFinished = vi.fn();
    const motion = createLoadingMotion({
      mount,
      photos: Array.from({ length: 20 }, (_, index) => ({
        id: `photo-${index}`,
        src: `data:image/jpeg;base64,${index}`,
        w: 300,
        h: 400,
        ratio: 0.75,
        color: { r: 80 + index, g: 100, b: 120 },
        hue: index * 18,
        sat: 0.5,
        lig: 0.4,
        css: 'rgb(100,100,100)',
        tintCss: 'hsl(0 50% 11%)',
        capturedAt: null,
        burstGroup: null,
      })),
      phase: 'SCAN',
      visualProgress: 25,
      speed: 0.6,
      reducedMotion: false,
      onPhaseStarted: (phase: string) => started.push(phase),
      onPhaseFinished: async (phase: string) => {
        if (phase === 'ASSEMBLE' && !repeatedAssemble) {
          repeatedAssemble = true;
          return { visiblePhase: 'ASSEMBLE', visualProgress: 75 };
        }
        const nextIndex = phases.indexOf(phase as (typeof phases)[number]) + 1;
        return {
          visiblePhase: phases[nextIndex],
          visualProgress: [25, 50, 75, 99, 99][nextIndex],
        };
      },
      onRevealFinished,
    });

    motion.start();
    for (let count = 0; count < 500 && !onRevealFinished.mock.calls.length; count += 1) {
      now += 100;
      const currentFrames = frames;
      frames = [];
      currentFrames.forEach((frame) => frame(now));
      await Promise.resolve();
    }

    expect(started).toEqual(phases);
    expect(repeatedAssemble).toBe(true);
    expect(onRevealFinished).toHaveBeenCalledTimes(1);

    motion.destroy();
    mount.remove();
  });
});
