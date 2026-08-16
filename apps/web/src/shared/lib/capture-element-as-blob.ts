import { toCanvas } from 'html-to-image';

import { canvasToBlob } from './canvas-to-blob';

// iOS WebKit은 foreignObject SVG 안의 이미지를 첫 래스터라이즈에서 그리지 못하는 일이 잦다
// (html-to-image 알려진 이슈). 같은 입력을 반복해서 그리면 앞선 시도에서 캐시·디코딩된
// 리소스로 온전히 그려지므로 마지막 결과를 쓴다.
// ponytail: 고정 3회 — 그래도 빠지는 기기가 나오면 결과 픽셀 검증 루프로 업그레이드
const CAPTURE_ATTEMPTS = 3;

export async function captureElementAsBlob(
  element: HTMLElement,
  options?: Parameters<typeof toCanvas>[1],
): Promise<Blob> {
  await Promise.all(
    Array.from(element.querySelectorAll('img'), (image) => {
      image.loading = 'eager';
      return image.decode();
    }),
  );

  let canvas = await toCanvas(element, { includeQueryParams: true, ...options });
  for (let attempt = 1; attempt < CAPTURE_ATTEMPTS; attempt += 1) {
    canvas = await toCanvas(element, { includeQueryParams: true, ...options });
  }
  return canvasToBlob(canvas);
}
