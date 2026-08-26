import { BOARD_TEXT_STYLE } from './board-text-style';

// textarea와 일반 요소는 줄바꿈 지점이 다를 수 있어, 실측으로 명시적 개행 변환
export function captureBoardTextLayout(textarea: HTMLTextAreaElement, value: string): string {
  const editorStyle = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');

  Object.assign(mirror.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    width: `${textarea.clientWidth}px`,
    padding: '0',
    border: '0',
    fontFamily: editorStyle.fontFamily,
    fontSize: editorStyle.fontSize,
    fontWeight: editorStyle.fontWeight,
    lineHeight: editorStyle.lineHeight,
    letterSpacing: editorStyle.letterSpacing,
    whiteSpace: BOARD_TEXT_STYLE.whiteSpace,
    overflowWrap: BOARD_TEXT_STYLE.overflowWrap,
    wordBreak: BOARD_TEXT_STYLE.wordBreak,
  });

  document.body.appendChild(mirror);

  try {
    return value
      .split('\n')
      .map((paragraph) => captureParagraphLines(mirror, paragraph))
      .join('\n');
  } finally {
    mirror.remove();
  }
}

function captureParagraphLines(mirror: HTMLDivElement, paragraph: string): string {
  if (!paragraph) return '';

  const textNode = document.createTextNode(paragraph);
  mirror.replaceChildren(textNode);

  const characters = Array.from(paragraph);
  const range = document.createRange();
  const measuredCharacters: Array<{ character: string; top: number }> = [];
  let offset = 0;

  for (const character of characters) {
    const nextOffset = offset + character.length;
    range.setStart(textNode, offset);
    range.setEnd(textNode, nextOffset);
    measuredCharacters.push({ character, top: range.getBoundingClientRect().top });
    offset = nextOffset;
  }

  return joinCharactersByVisualLine(measuredCharacters);
}

export function joinCharactersByVisualLine(
  characters: ReadonlyArray<{ character: string; top: number }>,
): string {
  let result = '';
  let previousTop: number | null = null;

  for (const { character, top } of characters) {
    if (previousTop !== null && Math.abs(top - previousTop) > 0.5) result += '\n';
    result += character;
    previousTop = top;
  }

  return result;
}
