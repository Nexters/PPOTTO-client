// 카카오 템플릿 이미지의 보드 자르기 기준이 정해지지 않아 임시로 뷰포트 기준을 쓴다
// 보드 화면은 세로로 길다 — 현재 뷰포트의 가운데를 짧은 변 길이의 정사각형으로 잘라 공유 카드 배경으로 그린다
export function drawCenterSquare(target: HTMLCanvasElement, source: HTMLCanvasElement) {
  const { width, height } = source;
  const side = Math.min(width, height);
  const sx = (width - side) / 2;
  const sy = (height - side) / 2;

  target.width = side;
  target.height = side;

  const ctx = target.getContext('2d');
  if (!ctx) throw new Error('캔버스 컨텍스트를 가져오지 못했습니다.');
  ctx.drawImage(source, sx, sy, side, side, 0, 0, side, side);
}
