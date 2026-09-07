import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLoadingMotion } from './ppotto-loading-motion';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const createPhotos = (length = 20) =>
  Array.from({ length }, (_, index) => ({
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
  }));

describe('ppotto loading motion', () => {
  it('서버가 이미 완료됐어도 모든 막을 순서대로 한 번씩 재생한다', async () => {
    let now = 0;
    let nextFrameId = 0;
    let frames: Array<(time: number) => void> = [];
    vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
      frames.push(callback);
      return ++nextFrameId;
    });
    const cancelFrame = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
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
      photos: createPhotos(),
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
    expect(mount.querySelector('.pm-fact')).toBeNull();
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

    for (let count = 0; count < 25; count += 1) {
      now += 100;
      const currentFrames = frames;
      frames = [];
      currentFrames.forEach((frame) => frame(now));
    }
    const stickers = [...mount.querySelectorAll<HTMLElement>('.pm-stk')];
    expect(stickers).toHaveLength(9);
    expect(stickers.every((sticker) => Number(sticker.style.opacity) === 1)).toBe(true);

    for (let count = 0; count < 42; count += 1) {
      now += 100;
      const currentFrames = frames;
      frames = [];
      currentFrames.forEach((frame) => frame(now));
    }
    expect(stickers.every((sticker) => Number(sticker.style.opacity) === 1)).toBe(true);
    expect(cancelFrame).toHaveBeenCalled();

    motion.destroy();
    mount.remove();
  });

  it('첫 프레임은 그리고 크기가 같으면 사진 보정을, 멈췄으면 프레임 문자열 생성을 생략한다', () => {
    let now = 1;
    let nextFrame: (time: number) => void = () => undefined;
    vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
      nextFrame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const mount = document.createElement('div');
    const motion = createLoadingMotion({
      mount,
      photos: createPhotos().slice(0, 1),
      phase: 'DECK',
      visualProgress: 75,
      speed: 1,
      reducedMotion: false,
      onPhaseFinished: async () => ({ visiblePhase: 'DECK', visualProgress: 99 }),
    });
    const advance = (milliseconds: number) => {
      for (let remaining = milliseconds; remaining > 0; remaining -= 100) {
        now += Math.min(remaining, 100);
        nextFrame(now);
      }
    };

    try {
      motion.start();
      const tile = mount.querySelector<HTMLElement>('.pm-deck .pm-tile')!;
      const photo = tile.querySelector<HTMLElement>('.pm-tile-photo')!;
      const outerTransform = vi.spyOn(tile.style, 'transform', 'set');
      const innerTransform = vi.spyOn(photo.style, 'transform', 'set');

      // DECK enter 이후 최초 rAF에서 위치와 사진 비율을 모두 초기화한다.
      nextFrame(now);
      expect(outerTransform).toHaveBeenCalledTimes(1);
      expect(innerTransform).toHaveBeenCalledTimes(1);
      const firstInnerTransform = photo.style.transform;

      // Gather: 타일 크기가 변하면 내부 사진의 역스케일도 갱신한다.
      outerTransform.mockClear();
      innerTransform.mockClear();
      advance(100);
      expect(outerTransform).toHaveBeenCalledTimes(1);
      expect(innerTransform).toHaveBeenCalledTimes(1);
      expect(photo.style.transform).not.toBe(firstInnerTransform);

      // Spread: 크기가 고정된 채 위치만 움직이면 바깥 transform만 쓴다.
      advance(1200);
      outerTransform.mockClear();
      innerTransform.mockClear();
      const beforeMove = tile.style.transform;
      advance(100);
      expect(outerTransform).toHaveBeenCalledTimes(1);
      expect(tile.style.transform).not.toBe(beforeMove);
      expect(innerTransform).not.toHaveBeenCalled();

      // Hold(전체 3.6초 중 55.5~61%): 완전히 같은 프레임은 문자열도 만들지 않는다.
      advance(650);
      outerTransform.mockClear();
      innerTransform.mockClear();
      const toFixed = vi.spyOn(Number.prototype, 'toFixed');
      advance(50);
      expect(outerTransform).not.toHaveBeenCalled();
      expect(innerTransform).not.toHaveBeenCalled();
      // 이 프레임에서는 진행률 표시의 toFixed(4) 하나만 남는다.
      expect(toFixed).toHaveBeenCalledTimes(1);
      expect(toFixed).toHaveBeenCalledWith(4);
    } finally {
      motion.destroy();
    }
  });
});
