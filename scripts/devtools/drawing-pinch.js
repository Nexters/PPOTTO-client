// DevTools Console/Snippets에 붙여넣고 ppottoPinch() 실행. 외부 의존성 없음.
// 실제 OS 터치가 아닌 합성 PointerEvent로 앱의 기존 핀치 핸들러를 실행한다.
(() => {
  if (window.ppottoPinch?.running) throw new Error('이미 핀치 테스트가 실행 중입니다.');

  window.ppottoPinch = async function ppottoPinch({ frames = 300, delay = 5000 } = {}) {
    if (ppottoPinch.running) throw new Error('이미 핀치 테스트가 실행 중입니다.');
    if (
      !Number.isInteger(frames) ||
      frames < 4 ||
      frames > 3600 ||
      !Number.isFinite(delay) ||
      delay < 0 ||
      delay > 60000
    ) {
      throw new Error('frames: 4~3600 정수, delay: 0~60000ms를 지정하세요.');
    }
    const target = document.querySelector('[data-pinch-target]');
    const board = target?.closest('[data-board-canvas]');
    const shape = target?.querySelector('path, circle');
    if (!board || !shape) throw new Error('이동 모드에서 그림 하나를 선택한 뒤 실행하세요.');

    ppottoPinch.running = true;
    let cancelled = false;
    let started = false;
    const active = new Set();
    let points = [];
    const nextFrame = () => new Promise(requestAnimationFrame);
    const cancel = (event) => {
      if (event.key === 'Escape' || document.hidden) cancelled = true;
    };
    const check = () => {
      if (cancelled || !target.isConnected || !target.hasAttribute('data-pinch-target')) {
        throw new Error('핀치 테스트 중단: Esc, 탭 숨김 또는 그림 선택 변경.');
      }
    };
    const send = (type, index) => {
      const down = type !== 'pointerup';
      board.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerType: 'touch',
          pointerId: 900001 + index,
          isPrimary: index === 0,
          button: type === 'pointermove' ? -1 : 0,
          buttons: down ? 1 : 0,
          pressure: down ? 0.5 : 0,
          clientX: points[index].x,
          clientY: points[index].y,
        }),
      );
    };
    window.addEventListener('keydown', cancel);
    document.addEventListener('visibilitychange', cancel);

    try {
      console.info(`[pinch] ${delay / 1000}초 뒤 시작. Performance 녹화를 켜세요. Esc: 중단.`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      check();
      const rect = shape.getBoundingClientRect();
      const viewport = board.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x <= viewport.left || x >= viewport.right || y <= viewport.top || y >= viewport.bottom) {
        throw new Error('선택한 그림의 중심이 보드 화면 안에 오도록 이동하세요.');
      }
      // 첫 포인터는 선택 범위 안의 중심에 둔다. 두 번째는 화면 여유가 있는 쪽에 둔다.
      const offset = (viewport.right - x >= x - viewport.left ? 1 : -1) * 60;
      const origin = [
        { x, y },
        { x: x + offset, y },
      ];
      const centerX = x + offset / 2;
      points = origin;
      for (let index = 0; index < 2; index++) {
        active.add(index);
        send('pointerdown', index);
      }
      await nextFrame();
      check();
      for (const name of ['start', 'release', 'end'])
        performance.clearMarks(`ppotto-pinch:${name}`);
      performance.clearMeasures('ppotto-pinch');
      performance.mark('ppotto-pinch:start');
      started = true;

      // ponytail: 고정 300단계를 rAF마다 한 번. 같은 입력량 비교용이며 실기기 입력률 재현은 아니다.
      for (let frame = 1; frame <= frames; frame++) {
        await nextFrame();
        check();
        const progress = frame / frames;
        const scale = 1 + 0.4 * Math.sin(Math.PI * progress);
        const angle = (Math.PI / 6) * Math.sin(2 * Math.PI * progress);
        points =
          frame === frames
            ? origin
            : origin.map((point) => ({
                x: centerX + (point.x - centerX) * scale * Math.cos(angle),
                y: y + (point.x - centerX) * scale * Math.sin(angle),
              }));
        send('pointermove', 0);
        send('pointermove', 1);
      }
      // React의 최신 미리보기가 refs에 반영된 뒤 두 포인터를 해제한다.
      await nextFrame();
      await nextFrame();
      check();
    } finally {
      if (started) performance.mark('ppotto-pinch:release');
      // 두 번째 손가락부터 해제해 기존 핀치 → 한 손가락 → 종료 경로를 따른다.
      for (const index of [...active].reverse()) send('pointerup', index);
      window.removeEventListener('keydown', cancel);
      document.removeEventListener('visibilitychange', cancel);
      if (started) {
        await nextFrame();
        await nextFrame();
        performance.mark('ppotto-pinch:end');
        performance.measure('ppotto-pinch', 'ppotto-pinch:start', 'ppotto-pinch:end');
      }
      ppottoPinch.running = false;
    }
    console.info(`[pinch] 완료: ${frames * 2}회 pointermove. 녹화를 중지하세요.`);
  };
  console.info('[pinch] 준비 완료. 그림을 선택한 뒤 ppottoPinch()를 실행하세요.');
})();
