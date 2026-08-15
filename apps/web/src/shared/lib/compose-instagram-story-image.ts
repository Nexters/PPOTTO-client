import { canvasToBlob } from './canvas-to-blob';

// 인스타그램 스토리 권장 규격(9:16)
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

/** 원본을 비율 유지한 채 대상 안에 딱 들어가는 크기와 중앙 배치 좌표를 구한다 */
export function fitContain(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { width, height, x: (targetWidth - width) / 2, y: (targetHeight - height) / 2 };
}

/**
 * 캡처한 카드를 9:16 스토리 캔버스에 contain으로 합성한다.
 * 인스타그램은 backgroundImage를 화면에 채우기(fill)로 스케일하므로, 정확히 9:16으로
 * 만들어 넘겨야 세로로 긴 카드가 잘리지 않고 화면에 딱 맞는다. 남는 영역은 검정.
 */
export async function composeInstagramStoryImage(card: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(card);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('캔버스 컨텍스트를 만들지 못했습니다.');

    context.fillStyle = '#000';
    context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

    const { width, height, x, y } = fitContain(
      bitmap.width,
      bitmap.height,
      STORY_WIDTH,
      STORY_HEIGHT,
    );
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, x, y, width, height);

    return await canvasToBlob(canvas);
  } finally {
    bitmap.close();
  }
}
