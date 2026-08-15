/* eslint-disable */
/**
 * 뽀또즈 · 생성 대기 로딩 모션  v1.7
 * SCAN → GROUP → ASSEMBLE → DECK → REVEAL
 *
 * 좌표는 전부 360×740 설계 좌표계 위에서 계산된다. 실제 화면 크기에는 루트를
 * transform: scale 로 맞춘다 — 좌표를 반응형으로 다시 푸는 대신 통째로 축소하는 쪽이
 * 막마다 손으로 맞춘 간격·겹침을 그대로 유지한다.
 *
 * 사진은 브라우저 안에서만 처리한다. 이 모듈은 네트워크를 쓰지 않는다.
 * 사용법 · 스펙 근거는 README.md / motion-spec.md 참고.
 */
export function createLoadingMotion(opts) {
  const mount = opts.mount;
  if (!mount) throw new Error('[loading-motion] opts.mount 가 필요합니다');
  if (!opts.photos || !opts.photos.length)
    throw new Error('[loading-motion] opts.photos 가 필요합니다');

  const state = {
    photos: opts.photos,
    reduced: opts.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches,
    loading: false,
  };

  let destroyed = false,
    raf = 0,
    ctaOnFlag = false;
  function setCta(on) {
    if (on === ctaOnFlag) return;
    ctaOnFlag = on;
    opts.onCtaEnable && opts.onCtaEnable(on);
  }

  /* ---- DOM ---------------------------------------------------- */
  const root = document.createElement('div');
  root.className = 'ppotto-motion';
  const mk = (cls, parent) => {
    const d = document.createElement('div');
    d.className = cls;
    (parent || root).appendChild(d);
    return d;
  };

  const elTint = mk('pm-tint');
  const elScan = mk('pm-layer pm-scan');
  const elTiles = mk('pm-layer pm-tiles');
  const elDeck = mk('pm-layer pm-deck');
  const elReveal = mk('pm-layer pm-reveal');
  const elBoard = mk('pm-board');
  const hideBroken = (e) => {
    e.target.style.display = 'none';
  };
  const elBoardBg = document.createElement('img');
  elBoardBg.className = 'pm-board-bg';
  elBoardBg.alt = '';
  elBoardBg.src = opts.boardBgSrc || 'assets/board-bg.png';
  elBoardBg.addEventListener('error', hideBroken);
  elBoard.appendChild(elBoardBg);

  const STICKER_COUNT = 9;
  const stickerSrcs =
    opts.stickerSrcs?.length === STICKER_COUNT
      ? opts.stickerSrcs
      : Array.from(
          { length: STICKER_COUNT },
          (_, index) => `assets/stickers/sticker${index + 1}.png`,
        );
  const elStickers = stickerSrcs.map((src) => {
    const image = document.createElement('img');
    image.className = 'pm-stk';
    image.alt = '';
    image.src = src;
    image.addEventListener('error', hideBroken);
    elBoard.appendChild(image);
    return image;
  });
  const elProgress = mk('pm-progress');
  const elProgressFill = mk('pm-progress-fill', elProgress);
  mk('pm-vignette');
  mk('pm-scrim-top');
  mk('pm-scrim-bottom');
  mount.appendChild(root);

  /* ---- 360×740 설계 좌표를 컨테이너에 맞춘다 -------------------- */
  function fit() {
    const r = mount.getBoundingClientRect();
    if (!r.width || !r.height) return;
    root.style.transform = `translate(-50%,-50%) scale(${Math.min(r.width / 360, r.height / 740)})`;
  }
  fit();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
  ro && ro.observe(mount);

  /* ============================================================
     상수 / 레이아웃
     ============================================================ */
  const W = 360,
    H = 740;
  const PAD = 16;
  const SAFE_TOP = 44;
  const BAND_Y = 112; // color band bottom offset

  const ACT = { SCAN: 0, GROUP: 1, ASSEMBLE: 2, DECK: 3, REVEAL: 4 };
  const ACT_NAME = ['SCAN', 'GROUP', 'ASSEMBLE', 'DECK', 'REVEAL'];
  const LAST_ACT = ACT.REVEAL;

  const TIMING = {
    scan: { min: 3400, max: 5000 },
    // GROUP은 기본 진행을 1.2배속으로 — 정렬이 끝나고 나면 남는 시간이 늘어져 보인다
    group: { min: 2830, max: 2830, loop: 2000 },
    assemble: { min: 2600, max: 2600 },
    // Expand를 걷어내고 원형 전환을 짧게 줄여 5.0 → 3.6s
    deck: { min: 3600, max: 3600 },
    reveal: { min: 2400, max: 2400 },
    maxWait: 40000,
    minTotal: 5000,
  };

  /* ============================================================
     유틸
     ============================================================ */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeOutBack = (t) => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const mx = Math.max(r, g, b),
      mn = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      switch (mx) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return { h: h * 360, s, l };
  }
  const rgbCss = (c) => `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;

  function extractDominant(source, sw, sh) {
    const N = 32;
    const c = document.createElement('canvas');
    c.width = N;
    c.height = N;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(source, 0, 0, sw, sh, 0, 0, N, N);
    const d = x.getImageData(0, 0, N, N).data;
    const buckets = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      const hsl = rgbToHsl(r, g, b);
      // 너무 어둡거나 밝은 픽셀은 대표색으로 부적절 — 가중치를 낮춘다
      let wgt = 1;
      if (hsl.l < 0.12 || hsl.l > 0.93) wgt = 0.12;
      wgt *= 0.35 + hsl.s * 1.5;
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const e = buckets.get(key) || { w: 0, r: 0, g: 0, b: 0 };
      e.w += wgt;
      e.r += r * wgt;
      e.g += g * wgt;
      e.b += b * wgt;
      buckets.set(key, e);
    }
    let best = null;
    for (const e of buckets.values()) if (!best || e.w > best.w) best = e;
    if (!best || best.w === 0) return { r: 120, g: 120, b: 120 };
    return { r: best.r / best.w, g: best.g / best.w, b: best.b / best.w };
  }

  function finalizePhoto(p, i, opts) {
    const hsl = rgbToHsl(p.color.r, p.color.g, p.color.b);
    p.hue = hsl.h;
    p.sat = hsl.s;
    p.lig = hsl.l;
    p.css = rgbCss(p.color);
    // 배경을 물들일 때 쓰는 어두운 버전 — 색상은 유지하고 명도만 눌러
    // 사진이 배경에 묻히지 않게 한다
    p.tintCss = `hsl(${hsl.h.toFixed(1)} ${clamp(hsl.s * 100, 22, 66).toFixed(1)}% ${lerp(8, 14, clamp(hsl.s, 0, 1)).toFixed(1)}%)`;
    p.id = i;
    // 메타데이터 (플레이스홀더는 합성, 실제 구현은 EXIF)
    p.capturedAt = opts.noMeta ? null : Date.now() - Math.round(rand(0, 90 * 864e5));
    p.burstGroup = null;
    return p;
  }

  function makeTile() {
    const d = document.createElement('div');
    d.className = 'pm-tile';
    return d;
  }
  function setTile(el, p, w, h, x, y, opt = {}) {
    el.style.backgroundImage = `url(${p.src})`;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    const s = opt.scale ?? 1,
      rot = opt.rot ?? 0;
    el.style.transform = `translate3d(${x}px,${y}px,0) rotate(${rot}deg) scale(${s})`;
    el.style.opacity = opt.opacity ?? 1;
    if (opt.filter !== undefined) el.style.filter = opt.filter;
  }

  const initialPhase = ACT[opts.phase] === undefined ? ACT.SCAN : ACT[opts.phase];
  const tl = {
    actIndex: initialPhase,
    actT: 0,
    speed: opts.speed ?? 0.6,
    finished: false,
    checking: false,
    exiting: false,
    exitT: 0,
    exitAt: 0,
    nextCheckAt: 0,
    nextState: null,
    lastFrame: 0,
  };

  const acts = []; // { id, dur(), enter(), update(t,dt), exit() }

  /* ============================================================
     RN이 계산한 시각 진행률을 현재 막의 재생 시간에 맞춰 부드럽게 표시한다.
     ============================================================ */
  const PHASE_START_PROGRESS = [0, 0.25, 0.5, 0.75, 0.99];
  let progressShown = PHASE_START_PROGRESS[initialPhase];
  let progressFrom = progressShown;
  let progressTarget = Math.max(progressShown, clamp((opts.visualProgress ?? 0) / 100, 0, 1));
  let progressElapsed = 0;
  let progressDuration = TIMING[ACT_NAME[initialPhase].toLowerCase()].min;
  let progressFading = false;

  function setProgressTarget(value, duration) {
    progressFrom = progressShown;
    progressTarget = Math.max(progressShown, clamp(value / 100, 0, 1));
    progressElapsed = 0;
    progressDuration = Math.max(duration, 1);
  }

  function paintProgress(dt) {
    progressElapsed += dt;
    if (tl.actIndex === LAST_ACT) {
      progressShown = Math.max(
        progressShown,
        lerp(progressFrom, 1, clamp(tl.actT / (TIMING.reveal.min * 0.34), 0, 1)),
      );
    } else {
      progressShown = Math.max(
        progressShown,
        lerp(progressFrom, progressTarget, clamp(progressElapsed / progressDuration, 0, 1)),
      );
    }
    elProgress.style.opacity = progressFading ? '0' : '1';
    elProgressFill.style.transform = `scaleX(${progressShown.toFixed(4)})`;
  }

  /* 막 사이에 넘겨주는 타일 위치 — 컷이 튀지 않도록 다음 막이 이 자리에서 이어받는다 */
  const handoff = [];

  /* 올라온 사진들의 대표 색 평균을 아주 어둡게 — GROUP·DECK의 바탕색.
     앨범 전체의 톤이 배경에 깔려 있어야 사진과 배경이 한 세계로 읽힌다. */
  function averageTint() {
    const ps = state.photos;
    if (!ps.length) return '#0e0e10';
    let r = 0,
      g = 0,
      b = 0;
    for (const p of ps) {
      r += p.color.r;
      g += p.color.g;
      b += p.color.b;
    }
    const n = ps.length,
      k = 0.17;
    return `rgb(${((r / n) * k) | 0},${((g / n) * k) | 0},${((b / n) * k) | 0})`;
  }

  function setTint(css, ms) {
    elTint.style.transition = `background ${ms}ms ${state.reduced ? 'linear' : 'cubic-bezier(.4,0,.2,1)'}`;
    elTint.style.background = css;
  }

  /* ============================================================
     막 1 — SCAN
     세로 스트립 다열이 서로 다른 속도로 흐르고, 중앙 포커스 밴드에
     들어온 사진만 살아난다. 밴드는 위→아래로 한 번 훑고 중앙에 안착.
     ============================================================ */
  const scan = (() => {
    let cols = []; // { el, tiles:[{el,p,h,y}], speed, dir, totalH, offset }
    let bandY = 0,
      swapTimer = 0;
    const tintCur = { r: 0, g: 0, b: 0 };

    // 1열은 쓰지 않는다 — 사진이 화면 폭을 다 먹어 콜라주 리듬이 사라진다
    function columnsForCount(n) {
      return n < 24 ? 2 : 3;
    }

    function enter() {
      elScan.classList.remove('hidden');
      elScan.innerHTML = '';
      elTiles.classList.add('hidden');
      elDeck.classList.add('hidden');
      elReveal.classList.add('hidden');
      setTint('#000', 300);

      const nCols = columnsForCount(state.photos.length);
      const gap = 8;
      // 화면 폭에 맞춘 값보다 20% 크게 — 뒤따르는 GROUP 그리드(약 61px)와
      // 확실히 구분되어야 한다. 넘치는 만큼은 좌우로 잘려 나가게 두는데,
      // 필름스트립이 화면보다 넓게 흐르는 편이 오히려 자연스럽다.
      const colW = ((W - PAD * 2 - gap * (nCols - 1)) / nCols) * 1.2;
      const spanW = colW * nCols + gap * (nCols - 1);
      const originX = (W - spanW) / 2; // 음수 = 양 끝이 잘린다
      const pool = state.noMeta ? shuffle(state.photos) : state.photos; // 시간순 정렬 or 셔플 폴백

      cols = [];
      for (let c = 0; c < nCols; c++) {
        const wrap = document.createElement('div');
        wrap.style.cssText = `position:absolute;left:${originX + c * (colW + gap)}px;top:0;width:${colW}px;height:${H}px;`;
        elScan.appendChild(wrap);

        const tiles = [];
        let y = 0;
        // 화면(740) 두 배 이상을 채워 무한 루프가 끊기지 않게
        let guard = 0;
        while (y < H * 2.2 && guard < 60) {
          const p = pool[(c * 7 + tiles.length * nCols + guard) % pool.length];
          const th = Math.round(colW / p.ratio);
          const el = makeTile();
          wrap.appendChild(el);
          setTile(el, p, colW, th, 0, y);
          tiles.push({ el, p, h: th, y });
          y += th + 6;
          guard++;
        }
        cols.push({
          el: wrap,
          tiles,
          totalH: y,
          offset: -rand(0, y),
          left: originX + c * (colW + gap), // handoff 좌표가 여기서 나온다 — wrap의 left와 반드시 같아야 한다
          speed: [230, 185, 265][c % 3] * rand(0.9, 1.12),
          dir: c % 2 === 0 ? -1 : 1,
          colW,
        });
      }
      bandY = -80;
      swapTimer = 0;
      tintCur.r = tintCur.g = tintCur.b = 0;
    }

    function dur() {
      return TIMING.scan.min;
    }

    function update(t, dt) {
      const p = clamp(t / dur(), 0, 1);

      // 포커스 밴드: 위쪽에서 시작해 아래로 훑고 중앙(45%)에 안착.
      // 대비는 0.5s에 걸쳐 올라온다 — 시작하자마자 화면이 까맣게 죽으면 안 된다.
      if (p < 0.6) {
        bandY = lerp(H * 0.14, H * 0.62, easeInOutCubic(p / 0.6));
      } else {
        bandY = lerp(H * 0.62, H * 0.45, easeOutCubic((p - 0.6) / 0.4));
      }
      const contrast = clamp(t / 500, 0, 1);

      // 마지막 0.5s 급정지
      const decel = p > 0.86 ? 1 - easeOutCubic((p - 0.86) / 0.14) : 1;
      const speedMul = state.reduced ? 0 : decel;

      const bandH = 145;
      let nearest = null,
        nearestD = Infinity;
      for (const col of cols) {
        col.offset += col.dir * col.speed * speedMul * (dt / 1000);
        // wrap
        if (col.offset < -col.totalH) col.offset += col.totalH;
        if (col.offset > 0) col.offset -= col.totalH;

        for (const tile of col.tiles) {
          let y = tile.y + col.offset;
          if (y < -tile.h) y += col.totalH;
          if (y > H) y -= col.totalH;
          const center = y + tile.h / 2;
          const d = Math.abs(center - bandY);
          if (d < nearestD) {
            nearestD = d;
            nearest = tile.p;
          }
          const inBand = clamp(1 - d / bandH, 0, 1);
          const e = easeOutCubic(inBand);
          // contrast=0이면 전부 평평하게 보이고, 1이면 밴드 안만 살아난다
          const bright = lerp(1, lerp(0.3, 1.1, e), contrast);
          const op = lerp(1, lerp(0.4, 1, e), contrast);
          const sc = lerp(1, lerp(0.94, 1.02, e), contrast);
          tile.lastY = y; // 다음 막에 넘겨줄 실제 위치
          tile.el.style.transform =
            `translate3d(0,${y.toFixed(1)}px,0)` +
            (state.reduced ? '' : ` scale(${sc.toFixed(3)})`);
          if (!state.reduced) {
            tile.el.style.opacity = op.toFixed(3);
            tile.el.style.filter = `brightness(${bright.toFixed(3)})`;
          }
        }
      }

      // reduced motion: 스크롤 대신 몇 장씩 크로스페이드로 교체한다.
      // 정지된 그리드만 보여주면 "훑는다"는 의미가 사라진다.
      if (state.reduced) {
        swapTimer += dt;
        if (swapTimer > 1600) {
          swapTimer = 0;
          const pool = state.photos;
          for (const col of cols) {
            const tile = pick(col.tiles);
            tile.el.style.transition = 'opacity .45s ease';
            tile.el.style.opacity = '0';
            const next = pool[(Math.random() * pool.length) | 0];
            setTimeout(() => {
              tile.p = next;
              tile.el.style.backgroundImage = `url(${next.src})`;
              tile.el.style.opacity = '1';
            }, 450);
          }
        }
      }

      // 밴드 한가운데 사진의 색이 배경에 옅게 번진다 — 막 2의 예고.
      // 사진이 빠르게 지나가므로 색은 곧장 갈아타지 않고 부드럽게 따라간다.
      if (nearest) {
        const k = clamp((dt / 1000) * 3.2, 0, 1);
        tintCur.r = lerp(tintCur.r, nearest.color.r, k);
        tintCur.g = lerp(tintCur.g, nearest.color.g, k);
        tintCur.b = lerp(tintCur.b, nearest.color.b, k);
        const amt = clamp((p - 0.3) / 0.7, 0, 1) * 0.3; // 최대 30%까지만 — 아직 주인공은 사진
        elTint.style.transition = 'none';
        elTint.style.background = `rgb(${(tintCur.r * amt) | 0},${(tintCur.g * amt) | 0},${(tintCur.b * amt) | 0})`;
      }
    }

    // 막 1이 끝날 때 화면에 남아 있던 타일의 위치를 넘겨준다.
    // 다음 막이 이 자리에서 이어받아야 컷이 튀지 않는다.
    function exit() {
      handoff.length = 0;
      for (const col of cols) {
        for (const tile of col.tiles) {
          const y = tile.lastY;
          if (y === undefined || y <= -tile.h || y >= H) continue;
          handoff.push({ p: tile.p, x: col.left, y, w: col.colW, h: tile.h });
        }
      }
      // 위에서 아래 순서로 넘겨야 다음 막의 배치가 자연스럽다
      handoff.sort((a, b) => a.y - b.y);
      elScan.classList.add('hidden');
      elScan.innerHTML = '';
      cols = [];
    }
    return { id: 'scan', enter, update, exit, dur };
  })();

  /* ============================================================
     막 2 — GROUP 이 쓰는 타일 셋. 스트립 자리에서 이어받아 색 기준 정렬.
     막 3은 여기서 자리를 넘겨받아 스티커로 바꿔 붙인다.
     ============================================================ */
  const tiles = (() => {
    let items = []; // { el, p, from:{x,y,w,h,r,o}, to:{...}, t0, dur }
    let built = false;

    const GRID = { cols: 5, rows: 5, gap: 6, top: 150 };
    // 크기가 다른 슬롯을 섞어야 격자가 아니라 무드보드로 읽힌다. [col, row, colSpan, rowSpan]
    const BENTO = {
      cols: 4,
      gap: 6,
      top: 104,
      cellH: 92,
      slots: [
        [0, 0, 2, 2],
        [2, 0, 2, 1],
        [2, 1, 1, 1],
        [3, 1, 1, 1],
        [0, 2, 1, 1],
        [1, 2, 1, 1],
        [2, 2, 2, 2],
        [0, 3, 2, 1],
        [2, 4, 2, 1],
        [0, 4, 2, 1],
      ],
    };

    function build(n) {
      elTiles.innerHTML = '';
      items = [];
      const pool = shuffle(state.photos).slice(0, n);
      for (const p of pool) {
        const el = makeTile();
        elTiles.appendChild(el);
        items.push({
          el,
          p,
          cur: { x: 0, y: 0, w: 50, h: 62, r: 0, o: 1, s: 1 },
          from: null,
          to: null,
          t0: 0,
          d: 600,
        });
      }
      built = true;
      return items;
    }

    /* 앞선 막이 남긴 타일 자리에서 그대로 이어받아 시작한다.
       모자라는 만큼은 사진 풀에서 채우되 화면 아래에 숨겨 둔다. */
    function buildFromHandoff(rects, n) {
      elTiles.innerHTML = '';
      items = [];
      const used = new Set();
      for (const r of rects.slice(0, n)) {
        const el = makeTile();
        elTiles.appendChild(el);
        used.add(r.p.id);
        items.push({
          el,
          p: r.p,
          cur: { x: r.x, y: r.y, w: r.w, h: r.h, r: 0, o: 1, s: 1 },
          from: null,
          to: null,
          t0: 0,
          d: 600,
        });
      }
      const rest = shuffle(state.photos.filter((p) => !used.has(p.id)));
      while (items.length < n && rest.length) {
        const p = rest.pop();
        const el = makeTile();
        elTiles.appendChild(el);
        items.push({
          el,
          p,
          cur: { x: rand(20, W - 80), y: H + rand(10, 120), w: 70, h: 88, r: 0, o: 0, s: 1 },
          from: null,
          to: null,
          t0: 0,
          d: 600,
        });
      }
      built = true;
      return items;
    }

    /* 넘겨받을 자리가 없을 때만 쓰는 폴백 — 화면 전체에 흩어진 시작 배치 */
    function scatterTargets() {
      return items.map(() => {
        const w = rand(56, 92),
          h = w * rand(1.05, 1.35);
        return {
          x: rand(-20, W - w + 20),
          y: rand(SAFE_TOP + 20, H - 190 - h),
          w,
          h,
          r: rand(-14, 14),
          o: rand(0.6, 1),
          s: 1,
        };
      });
    }

    function gridTargets(sortKey) {
      const { cols, rows, gap, top } = GRID;
      const cw = (W - PAD * 2 - gap * (cols - 1)) / cols;
      const ch = cw * 1.28;
      const order = items.map((it, i) => ({ i, k: sortKey(it.p) })).sort((a, b) => a.k - b.k);
      const out = new Array(items.length);
      order.forEach((o, rank) => {
        const c = rank % cols,
          r = Math.floor(rank / cols);
        out[o.i] = {
          x: PAD + c * (cw + gap),
          y: top + r * (ch + gap),
          w: cw,
          h: ch,
          r: 0,
          o: r < rows ? 1 : 0,
          s: 1,
        };
      });
      return out;
    }

    /* 벤토 그리드 — 크기가 제각각인 슬롯에 색상 순으로 스냅한다.
       슬롯보다 타일이 많으면 남는 타일은 축소·페이드아웃된다. */
    function bentoTargets() {
      const { cols, gap, top, cellH, slots } = BENTO;
      const cw = (W - PAD * 2 - gap * (cols - 1)) / cols;
      const order = items.map((it, i) => ({ i, k: it.p.hue })).sort((a, b) => a.k - b.k);
      const out = new Array(items.length);
      order.forEach((o, rank) => {
        const slot = slots[rank];
        if (!slot) {
          out[o.i] = { x: W / 2 - 25, y: H * 0.5, w: 50, h: 62, r: 0, o: 0, s: 0.7 };
          return;
        }
        const [c, r, cs, rs] = slot;
        out[o.i] = {
          x: PAD + c * (cw + gap),
          y: top + r * (cellH + gap),
          w: cw * cs + gap * (cs - 1),
          h: cellH * rs + gap * (rs - 1),
          r: 0,
          o: 1,
          s: 1,
        };
      });
      return out;
    }

    function tweenTo(targets, d, stagger, ease) {
      items.forEach((it, i) => {
        it.from = { ...it.cur };
        it.to = targets[i];
        it.d = d;
        it.delay = stagger ? (i % 7) * stagger : 0;
        it.ease = ease || easeOutCubic;
        it.t0 = performance.now();
      });
    }

    function apply(now) {
      for (const it of items) {
        // 트윈 목표가 아직 없으면 현재 상태 그대로 그린다 (enter 직후 첫 프레임)
        if (it.to) {
          const raw = (now - it.t0 - (it.delay || 0)) / it.d;
          const t = clamp(raw, 0, 1);
          const e = state.reduced ? t : it.ease(t);
          const c = it.cur,
            f = it.from,
            o = it.to;
          c.x = lerp(f.x, o.x, e);
          c.y = lerp(f.y, o.y, e);
          c.w = lerp(f.w, o.w, e);
          c.h = lerp(f.h, o.h, e);
          c.r = lerp(f.r, o.r, e);
          c.o = lerp(f.o, o.o, e);
          c.s = lerp(f.s ?? 1, o.s ?? 1, e);
        }
        const c = it.cur;
        it.el.style.width = c.w.toFixed(1) + 'px';
        it.el.style.height = c.h.toFixed(1) + 'px';
        it.el.style.transform = `translate3d(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px,0) rotate(${c.r.toFixed(2)}deg) scale(${c.s.toFixed(3)})`;
        it.el.style.opacity = c.o.toFixed(3);
        it.el.style.backgroundImage = `url(${it.p.src})`;
      }
    }

    return {
      build,
      buildFromHandoff,
      scatterTargets,
      gridTargets,
      bentoTargets,
      tweenTo,
      apply,
      get items() {
        return items;
      },
      get built() {
        return built;
      },
    };
  })();

  const group = (() => {
    const SORTS = [(p) => p.hue, (p) => p.lig, (p) => p.sat];
    let phase = -1;

    function enter() {
      elScan.classList.add('hidden');
      elDeck.classList.add('hidden');
      elReveal.classList.add('hidden');
      elTiles.classList.remove('hidden');

      const n = Math.min(25, Math.max(12, state.photos.length));
      // 앞 막(SCAN)의 스트립이 서 있던 자리를 그대로 이어받는다.
      // 큰 사진이 제자리에서 줄어들며 그리드로 빨려드는 게 컷 없이 읽힌다.
      if (handoff.length) tiles.buildFromHandoff(handoff, n);
      else {
        tiles.build(n);
        const sc = tiles.scatterTargets();
        tiles.items.forEach((it, i) => {
          it.cur = { ...sc[i] };
        });
      }
      tiles.apply(performance.now());
      phase = -1;

      // 배경은 사진들의 대표 색 평균으로 가라앉는다
      setTint(averageTint(), 600);
    }

    function dur() {
      return Number.POSITIVE_INFINITY;
    }

    function update(t) {
      const step = Math.floor(t / TIMING.group.loop);
      if (step !== phase) {
        phase = step;
        const sortFn = SORTS[step % SORTS.length];
        tiles.tweenTo(
          tiles.gridTargets(sortFn),
          state.reduced ? 320 : 750,
          state.reduced ? 0 : 22,
          easeInOutCubic,
        );
      }
      tiles.apply(performance.now());
    }

    function beginExit(t) {
      return t;
    }
    return { id: 'group', enter, update, dur, beginExit };
  })();

  /* ============================================================
     막 3 — ASSEMBLE (선별)
     묶인 그리드에서 사진이 한 장씩 뽑혀 나와 화면 중앙에 큰 카드로 서고,
     나머지 사진은 어두워져 선택된 카드에 시선이 모인다.
     "이 중에서 이것들이 골라졌다"가 읽혀야 하는 막이다.
     ============================================================ */
  const assemble = (() => {
    const PICKS = 4;
    const CARD_W = 196,
      CARD_H = 250;
    const CARD_X = W / 2 - CARD_W / 2;
    const CARD_Y = H * 0.43 - CARD_H / 2;

    let picks = []; // 뽑힌 타일(tiles.items의 항목)
    let cycleIdx = -1,
      repeating = false;

    function cycleMs() {
      return TIMING.assemble.min / PICKS;
    }

    /* 채도가 높고 서로 색이 다른 것끼리 골라야 "골랐다"가 눈에 보인다.
       비슷한 색이 연달아 나오면 배경이 안 바뀐 것처럼 읽힌다. */
    function choose() {
      const pool = tiles.items.filter((it) => (it.cur.o ?? 1) > 0.1);
      const sorted = pool.slice().sort((a, b) => b.p.sat - a.p.sat);
      const head = sorted.slice(0, Math.max(PICKS * 2, Math.ceil(sorted.length * 0.6)));
      const out = [];
      for (const it of shuffle(head)) {
        if (out.length >= PICKS) break;
        if (out.every((q) => Math.abs(((q.p.hue - it.p.hue + 540) % 360) - 180) > 26)) out.push(it);
      }
      while (out.length < PICKS && sorted.length) out.push(pick(sorted));
      return out.slice(0, PICKS);
    }

    function enter() {
      elScan.classList.add('hidden');
      elDeck.classList.add('hidden');
      elReveal.classList.add('hidden');
      elTiles.classList.remove('hidden');

      // 앞 막(GROUP)의 그리드를 그대로 이어받는다. 없을 때만(막 점프) 새로 세운다.
      // 이때는 트윈을 걸지 말고 그리드 좌표를 곧장 넣어야 한다 — 트윈 시작값은
      // 0,0 근처라서, 아래에서 잡는 home 좌표가 통째로 어긋난다.
      if (!tiles.built || !tiles.items.length) {
        const n = Math.min(25, Math.max(12, state.photos.length));
        tiles.build(n);
        const g = tiles.gridTargets((ph) => ph.hue);
        tiles.items.forEach((it, i) => {
          it.cur = { ...g[i] };
          it.to = null;
        });
      }
      // 뽑힌 카드가 그리드 위로 올라와야 하므로 원래 자리를 기억해 둔다
      for (const it of tiles.items) {
        it.home = { ...it.cur };
        it.el.style.zIndex = '1';
      }
      picks = choose();
      cycleIdx = -1;
      repeating = false;
      setTint('#000', state.reduced ? 160 : 380);
    }

    function dur() {
      return TIMING.assemble.min;
    }

    function startCycle(i) {
      const it = picks[i];
      if (!it) return;
      picks.forEach((q, qi) => {
        if (q) q.el.style.zIndex = String(qi === i ? 30 : 3);
      });
    }

    function update(t) {
      const p = clamp(t / dur(), 0, 1);
      const i = clamp(Math.floor(t / cycleMs()), 0, PICKS - 1);
      if (i !== cycleIdx) {
        cycleIdx = i;
        startCycle(i);
      }
      const local = clamp((t - i * cycleMs()) / cycleMs(), 0, 1);
      const now = performance.now();

      // 뽑히지 않은 사진은 뒤로 물러난다 — 골라진 것과 대비가 있어야 선별로 읽힌다.
      // 반복할 때는 이미 어두워진 상태를 유지해 매 사이클마다 다시 페이드하지 않는다.
      const dimProgress = repeating ? 1 : clamp(p * 3.2, 0, 1);
      const dim = state.reduced ? 0.45 : lerp(1, 0.2, dimProgress);
      const dimBright = lerp(1, 0.3, dimProgress);

      for (const it of tiles.items) {
        const h = it.home || it.cur;
        const pickIndex = picks.indexOf(it);
        let x = h.x,
          y = h.y,
          w = h.w,
          hh = h.h,
          o = 1,
          bright = 1;

        if (pickIndex === -1) {
          o = dim;
          bright = dimBright;
        } else if (pickIndex === i) {
          // 지금 뽑히는 장: 제자리에서 중앙의 큰 카드로 올라온다
          const e = state.reduced ? local : easeOutCubic(clamp(local / 0.62, 0, 1));
          x = lerp(h.x, CARD_X, e);
          y = lerp(h.y, CARD_Y, e);
          w = lerp(h.w, CARD_W, e);
          hh = lerp(h.h, CARD_H, e);
        } else {
          // 지나갔거나 아직 차례가 아닌 장은 그리드 자리에서 물러나 있다
          o = dim;
          bright = dimBright;
        }

        it.el.style.width = w.toFixed(1) + 'px';
        it.el.style.height = hh.toFixed(1) + 'px';
        it.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        it.el.style.opacity = o.toFixed(3);
        it.el.style.filter = `brightness(${bright.toFixed(2)})`;
        // 뽑힌 장만 앞으로 떠오르게 한다.
        it.el.style.boxShadow =
          pickIndex === i
            ? '0 20px 44px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.22)'
            : 'none';
        it.el.style.backgroundImage = `url(${it.p.src})`;
      }
    }

    function repeat() {
      for (const it of tiles.items) {
        if (it.home) it.cur = { ...it.home };
        it.el.style.zIndex = '1';
        it.el.style.opacity = state.reduced ? '0.450' : '0.200';
        it.el.style.filter = 'brightness(0.30)';
        it.el.style.boxShadow = 'none';
      }
      picks = choose();
      cycleIdx = -1;
      repeating = true;
    }

    /* 격자 자리를 그대로 DECK에 넘긴다.
       뽑힌 장을 큰 카드 크기로 넘기면 DECK 첫 프레임에 혼자 큰 사진이 남아 따로 논다. */
    function exit() {
      handoff.length = 0;
      for (const it of tiles.items) {
        const h = it.home || it.cur;
        handoff.push({ p: it.p, x: h.x, y: h.y, w: h.w, h: h.h });
      }
      for (const it of tiles.items) {
        it.el.style.filter = 'none';
        it.el.style.zIndex = '';
        it.el.style.boxShadow = 'none';
      }
      elTiles.style.transform = 'none';
    }

    return { id: 'assemble', enter, update, exit, dur, repeat };
  })();

  /* ============================================================
     막 4 — DECK
     앞 막이 세워 둔 그리드가 그 자리에서 한 덱으로 모이고,
     사선으로 펼쳤다가 원형으로 풀린 뒤 다시 합쳐진다.
     완성된 결과를 손에 쥐고 이리저리 펼쳐보는 동작이다.
     ============================================================ */
  const deck = (() => {
    const COUNT = 18;
    const CARD_W = 112,
      CARD_H = 140;
    const HOME_X = W / 2 - CARD_W / 2;
    const HOME_Y = H * 0.44 - CARD_H / 2;
    // 사선(좌상단 → 우하단)으로 펼친다. 17칸 × (15,20) = 255×340 이동 +
    // 카드 크기를 더하면 367×480 — 세로가 긴 화면에 거의 딱 들어가 잘리는 구간이 적다.
    const SPREAD_DX = 15,
      SPREAD_DY = 20;
    // 원형 펼침의 타원 반지름 — 카드까지 더해 360×740 안에 들어가는 최대치
    const RING_RX = 112,
      RING_RY = 158;
    // 포갠 덱의 두께 — 회전 없이 한 방향으로만 어긋나야 "겹친 카드 더미"로 읽힌다
    const STACK_STEP_X = 0.9,
      STACK_STEP_Y = 0.5;

    // 구간 경계 (막 길이에 대한 비율, 총 3.6s)
    const GATHER_END = 0.32; // 앞 막 자리 → 한 덱으로 모임      1.15s
    const SPREAD_END = 0.555; // → 사선 띠                        0.85s
    const SHOLD_END = 0.61; // 사선 유지                        0.20s
    const CIRCLE_END = 0.72; // → 원형 (짧게 한 번에)            0.40s
    const CHOLD_END = 0.875; // 원형 유지                        0.56s
    // 나머지 0.125 = 0.45s가 Collapse

    let cards = [];
    let extras = [];

    /* 앞 막이 남긴 자리 → 없으면 사진 풀에서 채운다.
       ASSEMBLE은 25장을 세워 두는데 덱은 18장만 쓴다. 남는 몫을 그냥 지우면
       컷에서 7장이 사라지는 게 보이므로, 같이 모이면서 더미에 흡수되게 한다. */
    function sources() {
      const out = [];
      const used = new Set();
      for (const r of handoff) {
        if (used.has(r.p.id)) continue;
        used.add(r.p.id);
        out.push({ p: r.p, x: r.x, y: r.y, w: r.w, h: r.h });
      }
      const rest = shuffle(state.photos.filter((p) => !used.has(p.id)));
      while (out.length < COUNT && rest.length) {
        const p = rest.pop();
        // 넘겨받을 자리가 없는 몫은 화면 중앙 근처에서 시작시킨다
        out.push({ p, x: rand(PAD, W - PAD - 88), y: rand(SAFE_TOP + 40, H - 240), w: 88, h: 110 });
      }
      return out;
    }

    function enter() {
      elScan.classList.add('hidden');
      elTiles.classList.add('hidden');
      elReveal.classList.add('hidden');
      elDeck.classList.remove('hidden');
      elDeck.innerHTML = '';

      const srcs = sources();
      // 화면 바깥쪽 사진이 앞 인덱스를 갖도록 — 바깥부터 들어와야 층이 쌓이는 게 보인다
      const ordered = srcs
        .map((src) => ({
          src,
          far: Math.hypot(src.x + src.w / 2 - W / 2, src.y + src.h / 2 - H * 0.44),
        }))
        .sort((a, b) => b.far - a.far)
        .map((o) => o.src);

      cards = [];
      extras = [];
      ordered.forEach((src, i) => {
        const el = makeTile();
        elDeck.appendChild(el);
        const item = { el, p: src.p, from: { x: src.x, y: src.y, w: src.w, h: src.h } };
        if (i < COUNT) {
          item.idx = cards.length;
          item.pol = ringPolar(item.idx);
          el.style.zIndex = String(item.idx + 1);
          cards.push(item);
        } else {
          // 덱에 들어가지 못한 몫 — 같이 모이며 사라진다
          el.style.zIndex = '0';
          extras.push(item);
        }
      });

      setTint(averageTint(), 500);
    }

    function dur() {
      return TIMING.deck.min;
    }

    /* 포갠 덱에서의 카드 위치.
       회전은 주지 않고 한 방향 오프셋만으로 두께를 만든다 —
       18장이 0.9px씩 밀리면서 옆면이 층으로 보인다. */
    function homeOf(c) {
      const d = c.idx - (COUNT - 1) / 2;
      return { x: HOME_X + d * STACK_STEP_X, y: HOME_Y - d * STACK_STEP_Y };
    }

    /* 사선으로 펼쳤을 때 — 좌상단에서 우하단으로. 회전은 없다 */
    function spreadOf(c) {
      const d = c.idx - (COUNT - 1) / 2;
      return { x: HOME_X + d * SPREAD_DX, y: HOME_Y + d * SPREAD_DY };
    }

    /* 사선 → 원형.
       고리의 기준 각을 사선과 '수직'으로 잡는 게 핵심이다.
       사선 방향에 맞추면 띠의 왼쪽 절반과 오른쪽 절반이 서로 반대 각에서 출발하는데,
       목표 각은 인덱스에 대해 단조롭게 늘어나므로 가운데에서 이동량이 10° → 170°로
       튄다 — 고리가 되다 말고 한가운데가 끊겨 보이는 원인이 이것이었다.
       수직으로 잡으면 목표 위치가 인덱스에 대해 매끈해서, 직선 보간만으로도
       띠가 한 번에 휘어 고리가 된다. */
    const RING_BASE = Math.atan2(SPREAD_DY / RING_RY, SPREAD_DX / RING_RX) + Math.PI / 2;
    function ringPolar(idx) {
      const a = RING_BASE + (idx - (COUNT - 1) / 2) * ((2 * Math.PI) / COUNT);
      return {
        x: HOME_X + Math.cos(a) * RING_RX,
        y: HOME_Y + Math.sin(a) * RING_RY,
      };
    }

    function update(t) {
      const p = clamp(t / dur(), 0, 1);

      // 덱에 못 들어간 몫 — 같은 리듬으로 모이면서 흐려진다
      for (const c of extras) {
        const k = clamp(p / GATHER_END, 0, 1);
        const e = state.reduced ? k : easeInOutCubic(k);
        const f = c.from;
        const x = lerp(f.x, HOME_X, e),
          y = lerp(f.y, HOME_Y, e);
        c.el.style.width = lerp(f.w, CARD_W, e).toFixed(1) + 'px';
        c.el.style.height = lerp(f.h, CARD_H, e).toFixed(1) + 'px';
        c.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        c.el.style.opacity = (1 - clamp((k - 0.45) / 0.4, 0, 1)).toFixed(3);
        c.el.style.backgroundImage = `url(${c.p.src})`;
      }

      for (const c of cards) {
        const home = homeOf(c),
          spread = spreadOf(c),
          ring = c.pol;
        let x,
          y,
          w = CARD_W,
          h = CARD_H;

        if (p < GATHER_END) {
          // ── Gather: 앞 막이 세워 둔 자리에서 그대로 한 덱으로 모인다.
          //    크기도 같이 줄어야 SCAN → GROUP처럼 앞 막에서 이어진 것으로 읽힌다.
          const k = clamp(p / GATHER_END, 0, 1);
          const kd = clamp((k - c.idx * 0.016) / (1 - (COUNT - 1) * 0.016), 0, 1);
          const e = state.reduced ? kd : easeInOutCubic(kd);
          const f = c.from;
          x = lerp(f.x, home.x, e);
          y = lerp(f.y, home.y, e);
          w = lerp(f.w, CARD_W, e);
          h = lerp(f.h, CARD_H, e);
        } else if (p < SPREAD_END) {
          // ── Spread: 덱이 사선 띠로 펼쳐진다
          const k = (p - GATHER_END) / (SPREAD_END - GATHER_END);
          const order = Math.abs(c.idx - (COUNT - 1) / 2) / ((COUNT - 1) / 2);
          const kd = clamp((k - (1 - order) * 0.2) / (1 - (1 - order) * 0.2), 0, 1);
          const e = state.reduced ? kd : easeOutCubic(kd);
          x = lerp(home.x, spread.x, e);
          y = lerp(home.y, spread.y, e);
        } else if (p < SHOLD_END) {
          // ── Hold: 펼친 띠를 그대로 보여준다. 흔들면 정렬이 무너져 띠로 읽히지 않는다
          x = spread.x;
          y = spread.y;
        } else if (p < CHOLD_END) {
          // ── Circle: 사선 띠가 한 번에 휘어 고리가 된다. 다 휘고 나면 그대로 유지
          const k = clamp((p - SHOLD_END) / (CIRCLE_END - SHOLD_END), 0, 1);
          const e = state.reduced ? k : easeInOutCubic(k);
          x = lerp(spread.x, ring.x, e);
          y = lerp(spread.y, ring.y, e);
        } else {
          // ── Collapse: 고리가 다시 덱으로 합쳐진다 (짧게 — 다음 막이 바로 이어진다)
          const k = (p - CHOLD_END) / (1 - CHOLD_END);
          const e = state.reduced ? k : easeInOutCubic(k);
          x = lerp(ring.x, home.x, e);
          y = lerp(ring.y, home.y, e);
        }

        // 다 합쳐진 직후 덱 전체가 살짝 눌렸다 펴진다
        let s = 1;
        if (!state.reduced && p > 0.96) {
          s = 1 + Math.sin(((p - 0.96) / 0.04) * Math.PI) * 0.02;
        }

        c.el.style.width = w.toFixed(1) + 'px';
        c.el.style.height = h.toFixed(1) + 'px';
        c.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(3)})`;
        c.el.style.backgroundImage = `url(${c.p.src})`;
      }
    }

    /* 포갠 덱의 자리를 그대로 넘긴다 — REVEAL은 이 더미에서 모자이크로 펼친다 */
    function exit() {
      handoff.length = 0;
      for (const c of cards) {
        const h = homeOf(c);
        handoff.push({ p: c.p, x: h.x, y: h.y, w: CARD_W, h: CARD_H });
      }
      elDeck.classList.add('hidden');
      elDeck.innerHTML = '';
      cards = [];
      extras = [];
    }

    // 두 번째 사이클부터는 이미 덱이 모여 있으므로 Gather 정지 구간을 다시 재생하지 않는다.
    function repeat() {
      exit();
      enter();
      return dur() * GATHER_END;
    }

    return { id: 'deck', enter, update, exit, dur, repeat };
  })();

  /* ============================================================
     막 5 — REVEAL
     덱이 화면을 꽉 채우도록 다 펼쳐진 뒤 서서히 사라지고,
     그 다음에 표지가 천천히 떠오르면서 CTA가 열린다. 대기의 끝이자 결과의 표지다.
     ============================================================ */
  const reveal = (() => {
    /* 교차하는 그리드 — 줄마다 칸 수와 폭이 달라 세로 이음매가 어긋난다.
       행 높이 합 = 740, 각 행의 폭 합 = 360. 화면 밖으로 나가는 여백이 없어야
       "꽉 찬 모자이크"로 읽히므로 값이 딱 떨어지게 잡았다. */
    const ROW_H = [116, 134, 122, 130, 118, 120];
    const ROW_W = [
      [104, 148, 108],
      [86, 104, 78, 92],
      [92, 152, 116],
      [126, 100, 134],
      [110, 140, 110],
      [204, 156],
    ];

    const MOSAIC_END = 0.38; // 덱 → 화면 가득 펼침                    0.91s
    const TILE_OUT_IN = 0.4; // 다 펼쳐진 뒤에 사라지기 시작            —
    const TILE_OUT_END = 0.6; // 완전히 사라지는 지점                    0.48s
    const BOARD_IN = 0.6; // 사진이 다 사라진 다음에 보드가 깔린다   —
    const BOARD_END = 0.72; // 도트 배경이 다 깔리는 지점 = 첫 장 출발  0.29s
    const CTA_AT = 0.78;

    const STICKERS = [
      { x: 0, y: 32, w: 196.2, h: 190.8 },
      { x: 224, y: 54, w: 101.8, h: 101.8 },
      { x: 143.2, y: 182.5, w: 69, h: 69 },
      { x: 172, y: 214, w: 157.8, h: 120.5 },
      { x: 0, y: 254, w: 349.5, h: 191.5 },
      { x: 258, y: 392, w: 79.2, h: 79.2 },
      { x: 42, y: 430, w: 148.2, h: 117 },
      { x: 168, y: 524, w: 150, h: 150.2 },
      { x: 87.5, y: 568, w: 65.5, h: 61.2 },
    ];
    const ORDER = [2, 9, 7, 3, 4, 8, 1, 5, 6].map((number) => number - 1);
    const FADE_MS = 80;
    const STAGGER = 200;
    const LAND_END = STAGGER * (STICKERS.length - 1) + FADE_MS;

    let cards = [];
    let ctaOn = false;
    let boardT = 0;

    // 스티커는 한 번만 붙고 그대로 멈춘다 — 완성된 보드가 대기 화면의 끝 그림이다
    function paintBoard(time) {
      for (let index = 0; index < STICKERS.length; index++) {
        const sticker = STICKERS[index];
        const element = elStickers[index];
        if (!element) continue;
        const start = ORDER.indexOf(index) * STAGGER;
        element.style.opacity = clamp((time - start) / FADE_MS, 0, 1).toFixed(3);
        element.style.width = sticker.w + 'px';
        element.style.height = sticker.h + 'px';
        element.style.transform = `translate3d(${sticker.x}px,${sticker.y}px,0)`;
      }
    }

    function buildCells() {
      const out = [];
      let y = 0;
      for (let r = 0; r < ROW_H.length; r++) {
        let x = 0;
        for (const w of ROW_W[r]) {
          out.push({ x, y, w, h: ROW_H[r] });
          x += w;
        }
        y += ROW_H[r];
      }
      return out;
    }

    function sources(n) {
      const out = [];
      const used = new Set();
      for (const rec of handoff) {
        if (out.length >= n) break;
        if (used.has(rec.p.id)) continue;
        used.add(rec.p.id);
        out.push({ p: rec.p, x: rec.x, y: rec.y, w: rec.w, h: rec.h });
      }
      const rest = shuffle(state.photos.filter((p) => !used.has(p.id)));
      // 넘겨받은 자리가 모자라면 덱이 서 있던 지점에서 꺼낸다
      while (out.length < n && rest.length) {
        out.push({ p: rest.pop(), x: W / 2 - 56, y: H * 0.44 - 70, w: 112, h: 140 });
      }
      return out;
    }

    function enter() {
      elScan.classList.add('hidden');
      elTiles.classList.add('hidden');
      elDeck.classList.add('hidden');
      elReveal.classList.remove('hidden', 'flat');
      elReveal.innerHTML = '';

      const cells = shuffle(buildCells());
      const srcs = sources(cells.length);
      cards = srcs.map((src, i) => {
        const el = makeTile();
        elReveal.appendChild(el);
        const cell = cells[i];
        const cx = cell.x + cell.w / 2,
          cy = cell.y + cell.h / 2;
        return {
          el,
          p: src.p,
          from: src,
          to: cell,
          // 가운데에서 가까운 칸부터 자리를 잡아야 바깥으로 번져 나가는 것으로 읽힌다
          lag: Math.hypot((cx - W / 2) / (W / 2), (cy - H / 2) / (H / 2)),
        };
      });
      const maxLag = Math.max(...cards.map((c) => c.lag), 1);
      // 지연 폭이 구간 길이에 비해 크면 바깥 칸이 출발도 못 한 채 끝난다
      for (const c of cards) c.lag = (c.lag / maxLag) * 0.14;

      // 다음 프레임에 .flat을 붙여 CSS가 모서리·그림자를 펴게 한다
      requestAnimationFrame(() => elReveal.classList.add('flat'));

      elBoard.style.opacity = '0';
      for (const c of cards) c.el.style.opacity = '1';
      for (const sticker of elStickers) sticker.style.opacity = '0';
      boardT = 0;
      ctaOn = false;
    }

    function dur() {
      return TIMING.reveal.min;
    }

    function idle(dt) {
      if (boardT >= LAND_END) return;
      boardT = Math.min(boardT + dt, LAND_END);
      paintBoard(boardT);
    }

    function update(t, dt) {
      const p = clamp(t / dur(), 0, 1);
      // 다 펼쳐진 뒤에 한꺼번에 사라진다 — 펼치면서 같이 흐려지면 다 펼친 모습을 못 본다
      const tileAlpha = (1 - clamp((p - TILE_OUT_IN) / (TILE_OUT_END - TILE_OUT_IN), 0, 1)).toFixed(
        3,
      );

      for (const c of cards) {
        const k = clamp((p - c.lag) / Math.max(MOSAIC_END - c.lag, 0.01), 0, 1);
        const e = state.reduced ? k : easeOutCubic(k);
        const f = c.from,
          to = c.to;
        const x = lerp(f.x, to.x, e),
          y = lerp(f.y, to.y, e);
        const w = lerp(f.w, to.w, e),
          h = lerp(f.h, to.h, e);
        // 칸을 정확히 채워야 하므로 여기서도 width/height를 직접 트윈한다.
        // scale로 대신하면 사진이 늘어나 보이고 이음매에 틈이 생긴다.
        c.el.style.width = w.toFixed(1) + 'px';
        c.el.style.height = h.toFixed(1) + 'px';
        c.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        c.el.style.backgroundImage = `url(${c.p.src})`;
        c.el.style.opacity = tileAlpha;
      }

      const boardProgress = clamp((p - BOARD_IN) / (BOARD_END - BOARD_IN), 0, 1);
      elBoard.style.opacity = (state.reduced ? boardProgress : easeOutCubic(boardProgress)).toFixed(
        3,
      );
      if (p >= BOARD_END) idle(dt || 0);

      if (p > 0.44) progressFading = true;
      if (p > CTA_AT && !ctaOn) {
        ctaOn = true;
        setCta(true);
      }
    }

    function exit() {
      elReveal.classList.add('hidden');
      elReveal.innerHTML = '';
      elBoard.style.opacity = '0';
      for (const sticker of elStickers) sticker.style.opacity = '0';
      boardT = 0;
      cards = [];
    }

    return { id: 'reveal', enter, update, exit, dur, idle };
  })();

  acts.push(scan, group, assemble, deck, reveal);

  const SCAN_MAIN_END = TIMING.scan.min * 0.86;
  const SCAN_EXIT_DURATION = TIMING.scan.min - SCAN_MAIN_END;

  function baseDuration(index) {
    return [
      TIMING.scan.min,
      TIMING.group.min,
      TIMING.assemble.min,
      TIMING.deck.min,
      TIMING.reveal.min,
    ][index];
  }

  function firstCheckAt(index) {
    if (index === ACT.SCAN) return SCAN_MAIN_END;
    if (index === ACT.GROUP) return TIMING.group.min;
    return baseDuration(index);
  }

  function enterCurrentAct(nextState) {
    tl.actT = 0;
    tl.exiting = false;
    tl.exitT = 0;
    tl.exitAt = 0;
    tl.nextState = null;
    tl.nextCheckAt = firstCheckAt(tl.actIndex);
    progressFading = false;
    acts[tl.actIndex].enter();
    setProgressTarget(nextState.visualProgress, baseDuration(tl.actIndex));
    opts.onPhaseStarted && opts.onPhaseStarted(ACT_NAME[tl.actIndex]);
  }

  function advanceTo(nextState) {
    acts[tl.actIndex].exit && acts[tl.actIndex].exit();
    const nextIndex = ACT[nextState.visiblePhase];
    if (nextIndex !== tl.actIndex + 1) {
      throw new Error(
        `[loading-motion] 막은 한 단계씩 이동해야 합니다: ${ACT_NAME[tl.actIndex]} → ${nextState.visiblePhase}`,
      );
    }
    tl.actIndex = nextIndex;
    tl.checking = false;
    enterCurrentAct(nextState);
  }

  function repeatCurrent(nextState) {
    tl.checking = false;
    setProgressTarget(nextState.visualProgress, baseDuration(tl.actIndex));

    if (tl.actIndex === ACT.SCAN) {
      // 첫 훑기가 끝난 뒤에는 사진 스트립을 멈추지 않는다. 다음 막이 결정된 순간에만 감속한다.
      tl.nextCheckAt = tl.actT + TIMING.scan.min;
      return;
    }
    if (tl.actIndex === ACT.GROUP) {
      tl.nextCheckAt = tl.actT + TIMING.group.loop;
      return;
    }
    if (tl.actIndex === ACT.ASSEMBLE) {
      assemble.repeat();
      tl.actT = 0;
      tl.nextCheckAt = TIMING.assemble.min;
      return;
    }
    if (tl.actIndex === ACT.DECK) {
      tl.actT = deck.repeat();
      tl.nextCheckAt = TIMING.deck.min;
    }
  }

  function beginAdvance(nextState) {
    tl.checking = false;
    tl.nextState = nextState;

    if (tl.actIndex === ACT.SCAN) {
      tl.exiting = true;
      tl.exitT = 0;
      return;
    }
    if (tl.actIndex === ACT.GROUP) {
      tl.exiting = true;
      tl.exitAt = group.beginExit(tl.actT);
      return;
    }
    advanceTo(nextState);
  }

  async function checkPhase() {
    if (tl.checking || tl.exiting || destroyed) return;
    tl.checking = true;
    const phase = ACT_NAME[tl.actIndex];

    try {
      const nextState = await opts.onPhaseFinished(phase);
      if (destroyed) return;
      if (ACT[nextState.visiblePhase] > tl.actIndex) beginAdvance(nextState);
      else repeatCurrent(nextState);
    } catch (error) {
      console.error('[loading-motion] 다음 막 확인 실패', error);
      repeatCurrent({ visiblePhase: phase, visualProgress: progressTarget * 100 });
    }
  }

  function tick(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(tick);
    if (!tl.lastFrame) tl.lastFrame = now;
    let dtReal = now - tl.lastFrame;
    tl.lastFrame = now;
    if (dtReal > 100) dtReal = 100; // 백그라운드 복귀 시 프레임 점프 방지
    const dt = dtReal * tl.speed;
    if (tl.finished) {
      reveal.idle(dt);
      return;
    }

    const act = acts[tl.actIndex];

    if (tl.actIndex === ACT.SCAN) {
      tl.actT += dt;
      if (tl.exiting) {
        tl.exitT += dt;
        act.update(SCAN_MAIN_END + tl.exitT, dt);
        if (tl.exitT >= SCAN_EXIT_DURATION) advanceTo(tl.nextState);
      } else {
        act.update(Math.min(tl.actT, SCAN_MAIN_END), dt);
        if (tl.actT >= tl.nextCheckAt) void checkPhase();
      }
    } else if (tl.actIndex === ACT.GROUP) {
      tl.actT += dt;
      act.update(tl.actT, dt);
      if (tl.exiting && tl.actT >= tl.exitAt) advanceTo(tl.nextState);
      else if (tl.actT >= tl.nextCheckAt) void checkPhase();
    } else if (tl.actIndex === ACT.REVEAL) {
      tl.actT += dt;
      act.update(Math.min(tl.actT, act.dur()), dt);
      if (tl.actT >= act.dur()) {
        tl.finished = true;
        opts.onRevealFinished && opts.onRevealFinished();
      }
    } else {
      tl.actT += dt;
      act.update(Math.min(tl.actT, act.dur()), dt);
      if (tl.actT >= tl.nextCheckAt) void checkPhase();
    }

    paintProgress(dt);
  }

  /* ============================================================
     생명주기
     ============================================================ */
  function start() {
    if (destroyed) return;
    setCta(false);
    elBoard.style.opacity = '0';
    elReveal.classList.remove('flat');
    elTint.style.background = '#000';
    elProgress.style.opacity = '0';
    elProgressFill.style.transform = `scaleX(${progressShown.toFixed(4)})`;
    handoff.length = 0;
    enterCurrentAct({
      visiblePhase: ACT_NAME[tl.actIndex],
      visualProgress: opts.visualProgress ?? PHASE_START_PROGRESS[tl.actIndex] * 100,
    });
    tl.lastFrame = 0;
    raf = requestAnimationFrame(tick);
  }

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(raf);
    ro && ro.disconnect();
    acts.forEach((a) => a.exit && a.exit());
    root.remove();
  }

  return {
    el: root,
    start,
    destroy,
    get finished() {
      return tl.finished;
    },
    get progress() {
      return progressShown;
    },
  };
}
