export const STICKER_OUTLINE_FILTER_ID = 'sticker-outline';

export function StickerOutlineFilter() {
  return (
    <svg width="0" height="0" className="absolute">
      <filter id={STICKER_OUTLINE_FILTER_ID}>
        <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="dilated" />
        <feFlood floodColor="white" result="color" />
        <feComposite in="color" in2="dilated" operator="in" result="outline" />
        <feMerge>
          <feMergeNode in="outline" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </svg>
  );
}
