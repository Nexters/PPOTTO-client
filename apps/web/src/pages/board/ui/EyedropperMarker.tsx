type EyedropperMarkerProps = {
  color: string;
};

export function EyedropperMarker({ color }: EyedropperMarkerProps) {
  return (
    <div className="pointer-events-none flex flex-col items-center gap-2">
      <svg
        width={49}
        height={58}
        viewBox="0 0 48.9984 58"
        fill="none"
        style={{ transform: 'scaleY(-1)' }}
        className="drop-shadow-[0px_0px_4px_rgba(0,0,0,0.32)]"
      >
        <path
          d="M24.4992 4L39.2577 19.3734C51.7412 32.3771 42.5252 54 24.4992 54C6.47328 54 -2.74279 32.3771 9.74075 19.3734L24.4992 4Z"
          fill={color}
          stroke="white"
          strokeWidth={2}
        />
      </svg>
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <circle cx={10} cy={10} r={6} fill={color} stroke="white" strokeWidth={2} />
      </svg>
    </div>
  );
}
