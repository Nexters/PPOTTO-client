// 한 줄에 maxRowWidth까지만 허용할 때, maxRows개 줄 안에 다 들어가는지 확인
function canFit(widths: number[], gap: number, maxRowWidth: number, maxRows: number): boolean {
  let rows = 1;
  let currentRowWidth = 0;

  for (const width of widths) {
    const next = currentRowWidth === 0 ? width : currentRowWidth + gap + width;
    if (next > maxRowWidth) {
      rows += 1;
      currentRowWidth = width;
      if (rows > maxRows) return false;
    } else {
      currentRowWidth = next;
    }
  }

  return true;
}

function countNaturalRows(widths: number[], gap: number, containerWidth: number): number {
  let rows = 1;
  let currentRowWidth = 0;

  for (const width of widths) {
    const next = currentRowWidth === 0 ? width : currentRowWidth + gap + width;
    if (next > containerWidth) {
      rows += 1;
      currentRowWidth = width;
    } else {
      currentRowWidth = next;
    }
  }

  return rows;
}

// widths 순서를 유지하면서 flex-wrap이 자연스럽게 나누는 줄 수에 맞춰 가장 넓은 줄이 최소가 되도록 재배치
export function balanceIntoRows(widths: number[], containerWidth: number, gap: number): number[][] {
  if (widths.length === 0) return [];

  const naturalRows = countNaturalRows(widths, gap, containerWidth);

  // naturalRows 안에 들어가는 가장 타이트한 한 줄 최대 너비를 좁혀나가며 찾음
  let low = Math.max(...widths);
  let high = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (canFit(widths, gap, mid, naturalRows)) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  const rows: number[][] = [];
  let currentRow: number[] = [];
  let currentRowWidth = 0;

  widths.forEach((width, index) => {
    const next = currentRow.length === 0 ? width : currentRowWidth + gap + width;
    if (next > low && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [index];
      currentRowWidth = width;
    } else {
      currentRow.push(index);
      currentRowWidth = next;
    }
  });
  if (currentRow.length > 0) rows.push(currentRow);

  return rows;
}
