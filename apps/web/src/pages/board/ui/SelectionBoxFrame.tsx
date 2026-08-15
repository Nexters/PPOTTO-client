'use client';

const BOX_COLOR = '#009fff';
const TICK_SIZE = 7;
const BORDER_WIDTH = 1.5;

const TICK_POSITIONS: { top?: number; bottom?: number; left?: number; right?: number }[] = [
  { top: -TICK_SIZE / 2, left: -TICK_SIZE / 2 },
  { top: -TICK_SIZE / 2, right: -TICK_SIZE / 2 },
  { bottom: -TICK_SIZE / 2, left: -TICK_SIZE / 2 },
  { bottom: -TICK_SIZE / 2, right: -TICK_SIZE / 2 },
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
        border: `${BORDER_WIDTH}px solid ${BOX_COLOR}`,
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
            width: TICK_SIZE,
            height: TICK_SIZE,
            background: '#fff',
            border: `${BORDER_WIDTH}px solid ${BOX_COLOR}`,
            boxSizing: 'border-box',
            ...position,
          }}
        />
      ))}
    </div>
  );
}
