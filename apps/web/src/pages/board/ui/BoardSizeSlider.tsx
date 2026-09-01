'use client';

import { useRef } from 'react';

const TRACK_HEIGHT = 240;
const HANDLE_SIZE = 24;

type BoardSizeSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onDraggingChange?: (isDragging: boolean) => void;
};

export function BoardSizeSlider({
  value,
  min,
  max,
  onChange,
  onDraggingChange,
}: BoardSizeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const updateFromClientY = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    onChange(Math.round(min + clamped * (max - min)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onDraggingChange?.(true);
    updateFromClientY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    updateFromClientY(e.clientY);
  };

  const handlePointerEnd = () => onDraggingChange?.(false);

  const ratio = (value - min) / (max - min);
  const handleBottom = ratio * (TRACK_HEIGHT - HANDLE_SIZE);

  return (
    <div
      className="pointer-events-auto absolute top-1/2 left-6 -translate-y-1/2 touch-none"
      style={{ height: TRACK_HEIGHT, width: HANDLE_SIZE }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        ref={trackRef}
        className="absolute top-0 left-1/2 w-4 -translate-x-1/2"
        style={{ height: TRACK_HEIGHT }}
      >
        <svg
          width="16"
          height={TRACK_HEIGHT}
          viewBox="0 0 16 240"
          fill="none"
          className="drop-shadow-[0px_0px_4px_rgba(0,0,0,0.32)]"
        >
          <path d="M2 2H14L9 238H8H7L2 2Z" fill="white" fillOpacity="0.4" />
        </svg>
      </div>
      <div
        className="absolute left-0 size-6 rounded-full bg-white shadow-[0px_0px_4px_0px_rgba(0,0,0,0.32)]"
        style={{ bottom: handleBottom }}
      />
    </div>
  );
}
