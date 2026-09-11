// 실행: node scripts/devtools/drawing-pinch.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const events = [];
const listeners = new Map();
const marks = [];
let selected = true;
let interrupt = false;
const board = {
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600 }),
  dispatchEvent(event) {
    events.push(event);
    if (interrupt && event.type === 'pointermove') listeners.get('keydown')({ key: 'Escape' });
  },
};
const target = {
  isConnected: true,
  hasAttribute: () => selected,
  closest: () => board,
  querySelector: () => ({
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 100, height: 100 }),
  }),
};
const host = {
  addEventListener: (name, listener) => listeners.set(name, listener),
  removeEventListener: (name) => listeners.delete(name),
};
const window = { ...host };
runInNewContext(readFileSync(new URL('./drawing-pinch.js', import.meta.url), 'utf8'), {
  window,
  document: { ...host, hidden: false, querySelector: () => (selected ? target : null) },
  PointerEvent: class {
    constructor(type, options) {
      Object.assign(this, { type }, options);
    }
  },
  requestAnimationFrame: (callback) => setImmediate(callback),
  setTimeout: (callback) => setImmediate(callback),
  performance: {
    clearMarks() {},
    clearMeasures() {},
    mark: (name) => marks.push(name),
    measure() {},
  },
  console: { info() {} },
});

const run = window.ppottoPinch({ frames: 4, delay: 0 });
await assert.rejects(window.ppottoPinch(), /이미/);
await run;
assert.deepEqual(
  events.map((event) => event.type),
  ['pointerdown', 'pointerdown', ...Array(8).fill('pointermove'), 'pointerup', 'pointerup'],
);
assert.deepEqual(
  events.slice(-2).map((event) => event.pointerId),
  [900002, 900001],
);
assert(events.every((event) => event.pointerType === 'touch' && event.bubbles));
assert.notEqual(events[2].clientY, events[0].clientY, '회전해야 한다');
assert(
  Math.hypot(events[5].clientX - events[4].clientX, events[5].clientY - events[4].clientY) > 60,
  '확대해야 한다',
);
for (let index = 0; index < 2; index++) {
  assert.equal(
    events[8 + index].clientX,
    events[index].clientX,
    '마지막 입력은 시작 좌표로 돌아온다',
  );
  assert.equal(events[8 + index].clientY, events[index].clientY);
}
assert.deepEqual(marks, ['ppotto-pinch:start', 'ppotto-pinch:release', 'ppotto-pinch:end']);
assert.equal(listeners.size, 0);
assert.equal(window.ppottoPinch.running, false);

events.length = 0;
interrupt = true;
await assert.rejects(window.ppottoPinch({ frames: 4, delay: 0 }), /중단/);
assert.deepEqual(
  events.slice(-2).map((event) => event.type),
  ['pointerup', 'pointerup'],
);
assert.equal(window.ppottoPinch.running, false);
assert.equal(listeners.size, 0);
selected = false;
await assert.rejects(window.ppottoPinch(), /그림 하나/);
await assert.rejects(window.ppottoPinch({ frames: 0 }), /frames/);
console.log('PASS: 확대·회전·원위치 입력, 종료 순서, 중복 실행, 중단 정리, 입력 검증');
