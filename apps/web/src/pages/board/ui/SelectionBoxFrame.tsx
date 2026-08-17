'use client';

const BOX_COLOR = '#009fff';
const TICK_SIZE = 7;
const BORDER_WIDTH = 1.5;

const scaled = (px: number) => `calc(var(--inv-camera-scale, 1) * ${px}px)`;

const BORDER = scaled(BORDER_WIDTH);
const TICK_OFFSET = scaled(-TICK_SIZE / 2);

const TICK_POSITIONS: { top?: string; bottom?: string; left?: string; right?: string }[] = [
  { top: TICK_OFFSET, left: TICK_OFFSET },
  { top: TICK_OFFSET, right: TICK_OFFSET },
  { bottom: TICK_OFFSET, left: TICK_OFFSET },
  { bottom: TICK_OFFSET, right: TICK_OFFSET },
];

type SelectionBoxFrameProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
};

export function SelectionBoxFrame({
  x,
  y,
  width,
  height,
  rotation = 0,
  zIndex,
}: SelectionBoxFrameProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        border: `${BORDER} solid ${BOX_COLOR}`,
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex,
      }}
    >
      {TICK_POSITIONS.map((position, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            width: scaled(TICK_SIZE),
            height: scaled(TICK_SIZE),
            background: '#fff',
            border: `${BORDER} solid ${BOX_COLOR}`,
            boxSizing: 'border-box',
            ...position,
          }}
        />
      ))}
    </div>
  );
}
